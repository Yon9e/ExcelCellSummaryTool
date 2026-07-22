use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// 仅当目标不存在时，以同目录临时文件完成写入后再原子替换。
/// 返回值表示本次是否实际写入了目标文件。
pub fn write_bytes_atomically_if_missing(
    target: &Path,
    contents: &[u8],
    description: &str,
) -> Result<bool, String> {
    if target.exists() {
        return Ok(false);
    }

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建迁移目录失败：{error}"))?;
    }

    let temporary = temporary_path(target);
    let write_result = (|| -> std::io::Result<()> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)?;
        file.write_all(contents)?;
        file.sync_all()
    })();
    if let Err(error) = write_result {
        let _ = fs::remove_file(&temporary);
        return Err(format!("{description}失败：{error}"));
    }

    if target.exists() {
        let _ = fs::remove_file(&temporary);
        return Ok(false);
    }
    if let Err(error) = fs::rename(&temporary, target) {
        let _ = fs::remove_file(&temporary);
        return Err(format!("{description}失败：{error}"));
    }
    Ok(true)
}

fn temporary_path(target: &Path) -> PathBuf {
    let filename = target
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("fadt-migration");
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    target.with_file_name(format!(
        ".{filename}.{}.{}.migrating",
        std::process::id(),
        timestamp
    ))
}
