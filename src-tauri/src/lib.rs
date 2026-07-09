#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_schemes,
            save_scheme,
            delete_scheme,
            path_exists,
            collect_sheet_conflicts,
            open_output_file,
            run_summary
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod excel_summary;
mod file_filter;
mod models;
mod scheme_store;

use std::path::{Path, PathBuf};

use models::{
    CurrentFileEvent, LogEvent, ProgressEvent, Scheme, SheetConflict, SummaryRequest, SummaryResult,
};
use tauri::{Emitter, Window};

#[tauri::command]
fn load_schemes() -> Result<Vec<Scheme>, String> {
    scheme_store::load_schemes()
}

#[tauri::command]
fn save_scheme(scheme: Scheme) -> Result<(), String> {
    scheme_store::save_scheme(scheme)
}

#[tauri::command]
fn delete_scheme(name: String) -> Result<bool, String> {
    scheme_store::delete_scheme(&name)
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(path.trim()).exists()
}

#[tauri::command]
fn collect_sheet_conflicts(request: SummaryRequest) -> Result<Vec<SheetConflict>, String> {
    excel_summary::collect_sheet_conflicts(&request)
}

fn validate_openable_file_path(path: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("输出文件路径不能为空。".to_string());
    }
    let output_path = PathBuf::from(trimmed);
    if !output_path.exists() {
        return Err(format!("文件不存在，无法打开：{}", output_path.display()));
    }
    if !output_path.is_file() {
        return Err(format!("目标不是文件，无法打开：{}", output_path.display()));
    }
    Ok(output_path)
}

#[tauri::command]
fn open_output_file(path: String) -> Result<(), String> {
    let output_path = validate_openable_file_path(&path)?;
    open_path_with_default_app(&output_path)
}

#[cfg(target_os = "windows")]
fn open_path_with_default_app(path: &Path) -> Result<(), String> {
    use std::iter::once;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let operation: Vec<u16> = "open".encode_utf16().chain(once(0)).collect();
    let file: Vec<u16> = path.as_os_str().encode_wide().chain(once(0)).collect();
    let result = unsafe {
        ShellExecuteW(
            0 as HWND,
            operation.as_ptr(),
            file.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        )
    } as isize;

    if result <= 32 {
        Err(format!("打开输出文件失败，ShellExecuteW 返回码：{result}"))
    } else {
        Ok(())
    }
}

#[cfg(target_os = "macos")]
fn open_path_with_default_app(path: &Path) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("打开输出文件失败：{error}"))
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_path_with_default_app(path: &Path) -> Result<(), String> {
    std::process::Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("打开输出文件失败：{error}"))
}

#[tauri::command]
async fn run_summary(window: Window, request: SummaryRequest) -> Result<SummaryResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let log_window = window.clone();
        let progress_window = window.clone();
        let current_file_window = window.clone();
        excel_summary::run_summary(
            request,
            move |event: LogEvent| {
                let _ = log_window.emit("summary-log", event);
            },
            move |event: ProgressEvent| {
                let _ = progress_window.emit("summary-progress", event);
            },
            move |path: String| {
                let _ = current_file_window.emit("summary-current-file", CurrentFileEvent { path });
            },
        )
    })
    .await
    .map_err(|error| format!("后台任务执行失败：{error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_missing_output_file_before_opening() {
        let missing_path = std::env::temp_dir().join(format!(
            "excel-summary-missing-open-target-{}.xlsx",
            std::process::id()
        ));

        let error = validate_openable_file_path(&missing_path.to_string_lossy()).unwrap_err();

        assert!(error.contains("文件不存在"));
    }
}
