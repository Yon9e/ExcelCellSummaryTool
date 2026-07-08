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
            run_summary
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod excel_summary;
mod file_filter;
mod models;
mod scheme_store;

use std::path::Path;

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
