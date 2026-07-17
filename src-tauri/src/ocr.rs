use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::Duration;
use sysinfo::{Pid, System};
use tauri::{AppHandle, Manager, Window};

const UMI_VERSION: &str = "2.1.5";
const UMI_RUNTIME_DIR: &str = "ocr-runtime";
const UMI_RESOURCE_DIR: &str = "umi-ocr";
const UMI_EXE: &str = "Umi-OCR.exe";
const UMI_PORT: u16 = 12_240;
const MAX_IMAGE_BYTES: u64 = 30 * 1024 * 1024;
const MAX_IMAGE_PIXELS: usize = 16_000_000;

static OCR_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

#[derive(Debug, Serialize)]
pub struct OcrRuntimeStatus {
    pub version: String,
    pub bundled: bool,
    pub prepared: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ImagePayload {
    pub path: String,
    pub data_url: String,
    pub size_bytes: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct OcrTextItem {
    pub text: String,
    pub score: f64,
    pub box_points: Vec<[i32; 2]>,
    #[serde(default)]
    pub end: String,
}

#[derive(Debug, Serialize, PartialEq)]
pub struct OcrImageResult {
    pub text: String,
    pub items: Vec<OcrTextItem>,
    pub elapsed_seconds: f64,
}

#[derive(Debug, Deserialize)]
struct UmiOcrResponse {
    code: i32,
    data: Value,
    #[serde(default)]
    time: f64,
}

#[derive(Debug, Deserialize)]
struct UmiOcrItem {
    text: String,
    score: f64,
    #[serde(rename = "box")]
    box_points: Vec<[i32; 2]>,
    #[serde(default)]
    end: String,
}

pub fn runtime_status(app: &AppHandle) -> OcrRuntimeStatus {
    let bundled = find_runtime_source(app).is_ok();
    let prepared = runtime_destination(app)
        .map(|path| path.join(UMI_EXE).is_file())
        .unwrap_or(false);
    let message = if prepared {
        "OCR 组件已就绪。".to_string()
    } else if bundled {
        "首次使用时将初始化 OCR 组件。".to_string()
    } else {
        "未找到 Umi-OCR 运行时，请先执行 scripts\\setup_umi_ocr.ps1。".to_string()
    };
    OcrRuntimeStatus {
        version: UMI_VERSION.to_string(),
        bundled,
        prepared,
        message,
    }
}

pub fn prepare_runtime(app: &AppHandle) -> Result<PathBuf, String> {
    let source = find_runtime_source(app)?;
    let destination = runtime_destination(app)?;
    let marker = destination.join(".financial-tool-runtime-version");
    let installed_version = fs::read_to_string(&marker)
        .unwrap_or_default()
        .trim()
        .to_string();

    if destination.join(UMI_EXE).is_file() && installed_version == UMI_VERSION {
        ensure_runtime_settings(&destination)?;
        return Ok(destination);
    }

    fs::create_dir_all(&destination).map_err(|error| format!("无法创建 OCR 运行目录：{error}"))?;
    copy_runtime_tree(&source, &destination, &source)?;
    fs::write(&marker, format!("{UMI_VERSION}\n"))
        .map_err(|error| format!("无法写入 OCR 版本标记：{error}"))?;
    ensure_runtime_settings(&destination)?;

    if !destination.join(UMI_EXE).is_file() {
        return Err("OCR 运行时复制不完整，缺少 Umi-OCR.exe。".to_string());
    }
    Ok(destination)
}

pub fn read_image(path: &str) -> Result<ImagePayload, String> {
    let image_path = validate_image_path(path)?;
    let metadata =
        fs::metadata(&image_path).map_err(|error| format!("无法读取图片信息：{error}"))?;
    if metadata.len() > MAX_IMAGE_BYTES {
        return Err("图片超过 30 MB，请先压缩或裁剪后重试。".to_string());
    }
    let bytes = fs::read(&image_path).map_err(|error| format!("读取图片失败：{error}"))?;
    validate_image_bytes(&bytes)?;
    let mime = image_mime(&image_path)?;
    Ok(ImagePayload {
        path: image_path.to_string_lossy().to_string(),
        data_url: format!("data:{mime};base64,{}", STANDARD.encode(bytes)),
        size_bytes: metadata.len(),
    })
}

pub fn recognize_image(app: &AppHandle, image_base64: &str) -> Result<OcrImageResult, String> {
    let _guard = ocr_lock()
        .lock()
        .map_err(|_| "OCR 任务锁已损坏，请重启应用。".to_string())?;
    let base64 = strip_data_url_prefix(image_base64);
    if base64.trim().is_empty() {
        return Err("待识别图片为空。".to_string());
    }
    if base64.len() > (MAX_IMAGE_BYTES as usize * 4 / 3) + 8 {
        return Err("图片超过 30 MB，请先压缩或裁剪后重试。".to_string());
    }
    let image_bytes = STANDARD
        .decode(base64)
        .map_err(|error| format!("图片 Base64 数据无效：{error}"))?;
    validate_image_bytes(&image_bytes)?;
    drop(image_bytes);

    let runtime = prepare_runtime(app)?;
    ensure_service(&runtime)?;

    let payload = json!({
        "base64": base64,
        "options": {
            "data.format": "dict",
            "tbpu.parser": "multi_none",
            "ocr.limit_side_len": 4320
        }
    });
    let client = http_client(Duration::from_secs(90))?;
    let url = format!("http://127.0.0.1:{UMI_PORT}/api/ocr");
    let mut last_error = String::new();

    for attempt in 0..2 {
        match client.post(&url).json(&payload).send() {
            Ok(response) => {
                let response = response
                    .error_for_status()
                    .map_err(|error| format!("Umi-OCR HTTP 返回失败：{error}"))?;
                let body = response
                    .text()
                    .map_err(|error| format!("读取 Umi-OCR 返回内容失败：{error}"))?;
                return parse_umi_response(&body);
            }
            Err(error) => {
                last_error = error.to_string();
                if attempt == 0 {
                    thread::sleep(Duration::from_millis(350));
                }
            }
        }
    }

    Err(format!("连接 Umi-OCR 失败：{last_error}"))
}

pub fn start_screenshot_ocr(app: &AppHandle, window: &Window) -> Result<String, String> {
    let _guard = ocr_lock()
        .lock()
        .map_err(|_| "OCR 任务锁已损坏，请重启应用。".to_string())?;
    let runtime = prepare_runtime(app)?;
    ensure_service(&runtime)?;
    window
        .minimize()
        .map_err(|error| format!("最小化主窗口失败：{error}"))?;
    thread::sleep(Duration::from_millis(250));
    if let Err(error) = spawn_umi_command(&runtime, &["--screenshot", "--clip"]) {
        let _ = window.unminimize();
        return Err(error);
    }
    thread::sleep(Duration::from_millis(900));
    let _ = window.unminimize();
    Ok("请框选屏幕区域，识别文字将自动复制到剪贴板。".to_string())
}

pub fn show_settings(app: &AppHandle) -> Result<String, String> {
    let _guard = ocr_lock()
        .lock()
        .map_err(|_| "OCR 任务锁已损坏，请重启应用。".to_string())?;
    let runtime = prepare_runtime(app)?;
    ensure_service(&runtime)?;
    spawn_umi_command(&runtime, &["--show"])?;
    Ok("已打开 Umi-OCR 设置与插件窗口。".to_string())
}

pub fn shutdown(app: &AppHandle) {
    if another_app_instance_is_running() {
        return;
    }
    let Ok(runtime) = runtime_destination(app) else {
        return;
    };
    if let Ok(Some(listener_pid)) = private_listener_pid(&runtime) {
        kill_private_process_tree(&runtime, listener_pid);
    }
}

fn ocr_lock() -> &'static Mutex<()> {
    OCR_LOCK.get_or_init(|| Mutex::new(()))
}

fn runtime_destination(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .local_data_dir()
        .map(|path| path.join("ExcelCellSummaryTool").join(UMI_RUNTIME_DIR))
        .map_err(|error| format!("无法确定 OCR 本地数据目录：{error}"))
}

fn find_runtime_source(app: &AppHandle) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            candidates.push(parent.join(UMI_RESOURCE_DIR));
        }
    }
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join(UMI_RESOURCE_DIR));
    }
    #[cfg(debug_assertions)]
    candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("third_party")
            .join("umi-ocr")
            .join("runtime"),
    );

    candidates
        .into_iter()
        .find(|path| path.join(UMI_EXE).is_file())
        .ok_or_else(|| {
            "未找到 Umi-OCR 运行时，请执行 scripts\\setup_umi_ocr.ps1 后重新构建。".to_string()
        })
}

fn copy_runtime_tree(source: &Path, destination: &Path, source_root: &Path) -> Result<(), String> {
    for entry in fs::read_dir(source).map_err(|error| format!("读取 OCR 资源失败：{error}"))?
    {
        let entry = entry.map_err(|error| format!("读取 OCR 资源项失败：{error}"))?;
        let path = entry.path();
        let relative = path
            .strip_prefix(source_root)
            .map_err(|error| format!("计算 OCR 相对路径失败：{error}"))?;
        let target = destination.join(relative);
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if matches!(name.as_ref(), ".settings" | ".pre_settings" | "logs") {
            continue;
        }
        if path.is_dir() {
            fs::create_dir_all(&target)
                .map_err(|error| format!("创建 OCR 目录失败：{}：{error}", target.display()))?;
            copy_runtime_tree(&path, destination, source_root)?;
        } else {
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)
                    .map_err(|error| format!("创建 OCR 文件目录失败：{error}"))?;
            }
            fs::copy(&path, &target)
                .map_err(|error| format!("复制 OCR 文件失败：{}：{error}", relative.display()))?;
        }
    }
    Ok(())
}

fn ensure_runtime_settings(runtime: &Path) -> Result<(), String> {
    let data_dir = runtime.join("UmiOCR-data");
    fs::create_dir_all(&data_dir).map_err(|error| format!("创建 OCR 数据目录失败：{error}"))?;
    let settings = data_dir.join(".settings");
    if !settings.exists() {
        let content = format!(
            "[Global]\nconfigs_advanced=true\nui.theme=Default Dark\nui.fontFamily=Microsoft YaHei UI\nwindow.startupInvisible=true\nwindow.closeWin2Hide=true\nwindow.hideTrayIcon=true\nscreenshot.hideWindow=true\nserver.enable=true\nserver.host=127.0.0.1\nserver.port={UMI_PORT}\nlogs.saveLogLevel=ERROR\nocr.api=win7_x64_RapidOCR-json\n"
        );
        fs::write(&settings, content).map_err(|error| format!("写入 OCR 设置失败：{error}"))?;
    }
    let pre_settings = data_dir.join(".pre_settings");
    if !pre_settings.exists() {
        let content = json!({
            "i18n": "zh_CN",
            "opengl": "AA_UseOpenGLES",
            "server_port": UMI_PORT,
            "last_pid": 0,
            "last_ptime": "0"
        });
        fs::write(&pre_settings, content.to_string())
            .map_err(|error| format!("写入 OCR 启动设置失败：{error}"))?;
    }
    Ok(())
}

fn ensure_service(runtime: &Path) -> Result<(), String> {
    if probe_private_service(runtime)?.is_some() {
        return Ok(());
    }
    let spawned_pid = spawn_umi_command(runtime, &["--hide"])?;
    for _ in 0..80 {
        match probe_private_service(runtime) {
            Ok(Some(_)) => return Ok(()),
            Ok(None) => thread::sleep(Duration::from_millis(250)),
            Err(error) => {
                kill_private_process_tree(runtime, spawned_pid);
                return Err(error);
            }
        }
    }
    kill_private_process_tree(runtime, spawned_pid);
    Err("Umi-OCR 服务未在 20 秒内启动，请打开 OCR 设置检查运行状态。".to_string())
}

fn probe_private_service(runtime: &Path) -> Result<Option<u32>, String> {
    let Some(listener_pid) = private_listener_pid(runtime)? else {
        return Ok(None);
    };
    let client = http_client(Duration::from_secs(2))?;
    let ready = client
        .get(format!("http://127.0.0.1:{UMI_PORT}/api/ocr/get_options"))
        .send()
        .map(|response| response.status().is_success())
        .unwrap_or(false);
    Ok(ready.then_some(listener_pid))
}

fn http_client(timeout: Duration) -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .timeout(timeout)
        .no_proxy()
        .build()
        .map_err(|error| format!("创建本地 OCR HTTP 客户端失败：{error}"))
}

fn spawn_umi_command(runtime: &Path, args: &[&str]) -> Result<u32, String> {
    let executable = runtime.join(UMI_EXE);
    if !executable.is_file() {
        return Err(format!("未找到 OCR 主程序：{}", executable.display()));
    }
    let mut command = Command::new(&executable);
    command.current_dir(runtime).args(args);
    configure_hidden_process(&mut command);
    command
        .spawn()
        .map(|child| child.id())
        .map_err(|error| format!("启动 Umi-OCR 失败：{error}"))
}

fn private_listener_pid(runtime: &Path) -> Result<Option<u32>, String> {
    let Some(listener_pid) = netstat_listener_pid(UMI_PORT)? else {
        return Ok(None);
    };
    let canonical_runtime = runtime
        .canonicalize()
        .map_err(|error| format!("无法确认 OCR 私有运行目录：{error}"))?;
    let mut system = System::new_all();
    system.refresh_all();
    let pid = Pid::from_u32(listener_pid);
    let process = system
        .process(pid)
        .ok_or_else(|| format!("端口 {UMI_PORT} 已被无法识别的进程占用，请关闭占用程序后重试。"))?;
    let executable = process
        .exe()
        .ok_or_else(|| format!("无法确认端口 {UMI_PORT} 的监听程序，请关闭占用程序后重试。"))?;
    let canonical_executable = executable
        .canonicalize()
        .unwrap_or_else(|_| executable.to_path_buf());
    if !canonical_executable.starts_with(&canonical_runtime) {
        return Err(format!(
            "端口 {UMI_PORT} 已被其他程序占用：{}",
            canonical_executable.display()
        ));
    }
    Ok(Some(listener_pid))
}

fn netstat_listener_pid(port: u16) -> Result<Option<u32>, String> {
    let system_root = std::env::var_os("SystemRoot")
        .map(PathBuf::from)
        .ok_or_else(|| "无法确定 Windows 系统目录。".to_string())?;
    let netstat = system_root.join("System32").join("netstat.exe");
    let mut command = Command::new(&netstat);
    command.args(["-ano", "-p", "tcp"]);
    configure_hidden_process(&mut command);
    let output = command
        .output()
        .map_err(|error| format!("无法检查 OCR 端口占用：{error}"))?;
    if !output.status.success() {
        return Err(format!(
            "检查 OCR 端口失败，netstat 退出码：{}",
            output.status.code().unwrap_or(-1)
        ));
    }
    Ok(parse_netstat_listener_pid(
        &String::from_utf8_lossy(&output.stdout),
        port,
    ))
}

fn parse_netstat_listener_pid(output: &str, port: u16) -> Option<u32> {
    let expected_port = port.to_string();
    output.lines().find_map(|line| {
        let columns: Vec<&str> = line.split_whitespace().collect();
        if columns.len() < 5
            || !columns[0].eq_ignore_ascii_case("TCP")
            || !columns[3].eq_ignore_ascii_case("LISTENING")
            || columns[1].rsplit(':').next() != Some(expected_port.as_str())
        {
            return None;
        }
        columns[4].parse::<u32>().ok()
    })
}

fn kill_private_process_tree(runtime: &Path, root_pid: u32) {
    let canonical_runtime = runtime
        .canonicalize()
        .unwrap_or_else(|_| runtime.to_path_buf());
    let mut system = System::new_all();
    system.refresh_all();
    let mut process_ids = HashSet::from([Pid::from_u32(root_pid)]);
    loop {
        let before = process_ids.len();
        for (pid, process) in system.processes() {
            if process
                .parent()
                .map(|parent| process_ids.contains(&parent))
                .unwrap_or(false)
            {
                process_ids.insert(*pid);
            }
        }
        if process_ids.len() == before {
            break;
        }
    }
    for pid in process_ids {
        let Some(process) = system.process(pid) else {
            continue;
        };
        let Some(executable) = process.exe() else {
            continue;
        };
        let executable = executable
            .canonicalize()
            .unwrap_or_else(|_| executable.to_path_buf());
        if executable.starts_with(&canonical_runtime) {
            let _ = process.kill();
        }
    }
}

fn another_app_instance_is_running() -> bool {
    let Ok(current_pid) = sysinfo::get_current_pid() else {
        return false;
    };
    let Ok(current_exe) = std::env::current_exe() else {
        return false;
    };
    let Some(current_name) = current_exe.file_name() else {
        return false;
    };
    let mut system = System::new_all();
    system.refresh_all();
    system.processes().iter().any(|(pid, process)| {
        *pid != current_pid
            && process
                .exe()
                .and_then(|path| path.file_name())
                .map(|name| name.eq_ignore_ascii_case(current_name))
                .unwrap_or(false)
    })
}

fn validate_image_bytes(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() as u64 > MAX_IMAGE_BYTES {
        return Err("图片超过 30 MB，请先压缩或裁剪后重试。".to_string());
    }
    let size =
        imagesize::blob_size(bytes).map_err(|error| format!("无法解析图片格式或尺寸：{error}"))?;
    let pixels = size
        .width
        .checked_mul(size.height)
        .ok_or_else(|| "图片像素尺寸异常。".to_string())?;
    if size.width == 0 || size.height == 0 || pixels > MAX_IMAGE_PIXELS {
        return Err("图片尺寸异常或超过 1600 万像素，请裁剪后重试。".to_string());
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn configure_hidden_process(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    command.creation_flags(0x0800_0000);
}

#[cfg(not(target_os = "windows"))]
fn configure_hidden_process(_command: &mut Command) {}

fn strip_data_url_prefix(value: &str) -> &str {
    if value.trim_start().starts_with("data:") {
        value.split_once(',').map(|(_, data)| data).unwrap_or("")
    } else {
        value
    }
}

fn parse_umi_response(body: &str) -> Result<OcrImageResult, String> {
    let response: UmiOcrResponse =
        serde_json::from_str(body).map_err(|error| format!("解析 Umi-OCR 返回失败：{error}"))?;
    match response.code {
        100 => {
            let raw_items: Vec<UmiOcrItem> = serde_json::from_value(response.data)
                .map_err(|error| format!("解析 Umi-OCR 文本框失败：{error}"))?;
            let items: Vec<OcrTextItem> = raw_items
                .into_iter()
                .map(|item| OcrTextItem {
                    text: item.text,
                    score: item.score,
                    box_points: item.box_points,
                    end: item.end,
                })
                .collect();
            let text = items
                .iter()
                .map(|item| format!("{}{}", item.text, item.end))
                .collect::<String>();
            Ok(OcrImageResult {
                text,
                items,
                elapsed_seconds: response.time,
            })
        }
        101 => Ok(OcrImageResult {
            text: String::new(),
            items: Vec::new(),
            elapsed_seconds: response.time,
        }),
        code => Err(format!(
            "Umi-OCR 识别失败（状态码 {code}）：{}",
            response.data
        )),
    }
}

fn validate_image_path(value: &str) -> Result<PathBuf, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("图片路径不能为空。".to_string());
    }
    let path = PathBuf::from(trimmed);
    if !path.is_file() {
        return Err(format!("图片不存在：{}", path.display()));
    }
    image_mime(&path)?;
    Ok(path)
}

fn image_mime(path: &Path) -> Result<&'static str, String> {
    match path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "png" => Ok("image/png"),
        "jpg" | "jpeg" => Ok("image/jpeg"),
        "bmp" => Ok("image/bmp"),
        "webp" => Ok("image/webp"),
        "tif" | "tiff" => Ok("image/tiff"),
        _ => Err("仅支持 PNG、JPG、JPEG、BMP、WEBP、TIF、TIFF 图片。".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_successful_ocr_response() {
        let body = r#"{
            "code": 100,
            "data": [{
                "text": "主营业务收入",
                "score": 0.98,
                "box": [[1,2],[20,2],[20,10],[1,10]],
                "end": "\n"
            }],
            "time": 0.42
        }"#;

        let result = parse_umi_response(body).unwrap();

        assert_eq!(result.text, "主营业务收入\n");
        assert_eq!(result.items[0].box_points[2], [20, 10]);
        assert_eq!(result.elapsed_seconds, 0.42);
    }

    #[test]
    fn accepts_data_url_and_plain_base64() {
        assert_eq!(strip_data_url_prefix("data:image/png;base64,abcd"), "abcd");
        assert_eq!(strip_data_url_prefix("abcd"), "abcd");
    }

    #[test]
    fn reports_no_text_as_empty_result() {
        let result = parse_umi_response(r#"{"code":101,"data":"No text","time":0.1}"#).unwrap();

        assert!(result.text.is_empty());
        assert!(result.items.is_empty());
    }

    #[test]
    fn parses_only_the_requested_listening_port() {
        let output = "  TCP    127.0.0.1:12239    0.0.0.0:0    LISTENING    11\r\n\
                      TCP    127.0.0.1:12240    0.0.0.0:0    LISTENING    42\r\n";

        assert_eq!(parse_netstat_listener_pid(output, 12_240), Some(42));
        assert_eq!(parse_netstat_listener_pid(output, 12_241), None);
    }

    #[test]
    fn rejects_image_headers_with_too_many_pixels() {
        let mut png = STANDARD
            .decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=")
            .unwrap();
        assert!(validate_image_bytes(&png).is_ok());

        png[16..20].copy_from_slice(&5_000_u32.to_be_bytes());
        png[20..24].copy_from_slice(&4_000_u32.to_be_bytes());
        assert!(validate_image_bytes(&png).is_err());
        assert!(validate_image_bytes(b"not an image").is_err());
    }
}
