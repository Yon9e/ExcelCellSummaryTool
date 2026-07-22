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
            get_ocr_runtime_status,
            prepare_ocr_runtime,
            get_ocr_settings,
            save_ocr_settings,
            read_image_file,
            read_clipboard_image,
            read_clipboard_text,
            write_clipboard_text,
            write_clipboard_text_if_sequence,
            get_clipboard_sequence_number,
            ocr_image_base64,
            start_screenshot_ocr,
            show_ocr_settings,
            collect_sheet_conflicts,
            open_output_file,
            run_summary
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                ocr::shutdown(app_handle);
            }
        });
}

mod clipboard_text;
mod excel_summary;
mod file_filter;
mod models;
mod ocr;
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
fn save_scheme(scheme: Scheme, previous_name: Option<String>) -> Result<(), String> {
    scheme_store::save_scheme(scheme, previous_name.as_deref())
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
fn get_ocr_runtime_status(app: tauri::AppHandle) -> ocr::OcrRuntimeStatus {
    ocr::runtime_status(&app)
}

#[tauri::command]
async fn prepare_ocr_runtime(app: tauri::AppHandle) -> Result<ocr::OcrRuntimeStatus, String> {
    tauri::async_runtime::spawn_blocking(move || ocr::initialize_runtime(&app))
        .await
        .map_err(|error| format!("OCR 初始化任务失败：{error}"))?
}

#[tauri::command]
async fn get_ocr_settings(app: tauri::AppHandle) -> Result<ocr::OcrSettings, String> {
    tauri::async_runtime::spawn_blocking(move || ocr::get_settings(&app))
        .await
        .map_err(|error| format!("读取 OCR 设置任务失败：{error}"))?
}

#[tauri::command]
async fn save_ocr_settings(
    app: tauri::AppHandle,
    settings: ocr::OcrSettings,
) -> Result<ocr::OcrSettings, String> {
    tauri::async_runtime::spawn_blocking(move || ocr::save_settings(&app, settings))
        .await
        .map_err(|error| format!("保存 OCR 设置任务失败：{error}"))?
}

#[tauri::command]
async fn read_clipboard_image() -> Result<Option<ocr::ImagePayload>, String> {
    tauri::async_runtime::spawn_blocking(ocr::read_clipboard_image)
        .await
        .map_err(|error| format!("剪贴板读取任务失败：{error}"))?
}

#[tauri::command]
async fn read_clipboard_text() -> Result<clipboard_text::ClipboardTextPayload, String> {
    tauri::async_runtime::spawn_blocking(clipboard_text::read)
        .await
        .map_err(|error| format!("剪贴板文本读取任务失败：{error}"))?
}

#[tauri::command]
async fn write_clipboard_text(text: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || clipboard_text::write(text))
        .await
        .map_err(|error| format!("剪贴板文本写入任务失败：{error}"))?
}

#[tauri::command]
async fn write_clipboard_text_if_sequence(
    text: String,
    expected_sequence: u32,
) -> Result<Option<u32>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        clipboard_text::write_if_sequence(text, expected_sequence)
    })
    .await
    .map_err(|error| format!("剪贴板文本写入任务失败：{error}"))?
}

#[tauri::command]
fn get_clipboard_sequence_number() -> u32 {
    ocr::clipboard_sequence_number()
}

#[tauri::command]
async fn read_image_file(path: String) -> Result<ocr::ImagePayload, String> {
    tauri::async_runtime::spawn_blocking(move || ocr::read_image(&path))
        .await
        .map_err(|error| format!("图片读取任务失败：{error}"))?
}

#[tauri::command]
async fn ocr_image_base64(
    app: tauri::AppHandle,
    image_base64: String,
) -> Result<ocr::OcrImageResult, String> {
    tauri::async_runtime::spawn_blocking(move || ocr::recognize_image(&app, &image_base64))
        .await
        .map_err(|error| format!("OCR 后台任务失败：{error}"))?
}

#[tauri::command]
async fn start_screenshot_ocr(app: tauri::AppHandle, window: Window) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || ocr::start_screenshot_ocr(&app, &window))
        .await
        .map_err(|error| format!("截图 OCR 后台任务失败：{error}"))?
}

#[tauri::command]
async fn show_ocr_settings(app: tauri::AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || ocr::show_settings(&app))
        .await
        .map_err(|error| format!("打开 OCR 设置任务失败：{error}"))?
}

#[tauri::command]
async fn collect_sheet_conflicts(
    window: Window,
    request: SummaryRequest,
) -> Result<Vec<SheetConflict>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        excel_summary::collect_sheet_conflicts(&request, move |event: ProgressEvent| {
            let _ = window.emit("summary-progress", event);
        })
    })
    .await
    .map_err(|error| format!("Sheet 冲突检查后台任务失败：{error}"))?
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
