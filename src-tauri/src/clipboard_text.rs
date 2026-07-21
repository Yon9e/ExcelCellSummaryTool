use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ClipboardTextPayload {
    pub text: String,
    pub html: Option<String>,
}

#[cfg(target_os = "windows")]
pub fn read() -> Result<ClipboardTextPayload, String> {
    use clipboard_win::{formats, get_clipboard, Format};

    let unicode_format = formats::Unicode;
    let text = if unicode_format.is_format_avail() {
        get_clipboard::<String, _>(unicode_format)
            .map_err(|error| format!("读取剪贴板文本失败：{error}"))?
    } else {
        String::new()
    };
    let html = match formats::Html::new() {
        Some(format) if format.is_format_avail() => Some(
            get_clipboard::<String, _>(format)
                .map_err(|error| format!("读取剪贴板 HTML 失败：{error}"))?,
        )
        .filter(|value| !value.trim().is_empty()),
        _ => None,
    };

    if text.is_empty() && html.is_none() {
        return Err("剪贴板中没有可读取的文本或 HTML 内容。".to_string());
    }

    Ok(ClipboardTextPayload { text, html })
}

#[cfg(not(target_os = "windows"))]
pub fn read() -> Result<ClipboardTextPayload, String> {
    Err("剪贴板文本清洗目前仅支持 Windows。".to_string())
}

#[cfg(target_os = "windows")]
pub fn write(text: String) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|error| format!("无法访问系统剪贴板：{error}"))?;
    clipboard
        .set_text(text)
        .map_err(|error| format!("写入系统剪贴板失败：{error}"))
}

#[cfg(not(target_os = "windows"))]
pub fn write(_text: String) -> Result<(), String> {
    Err("剪贴板文本清洗目前仅支持 Windows。".to_string())
}
