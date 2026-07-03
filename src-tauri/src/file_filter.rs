use std::fs;
use std::path::{Path, PathBuf};

use crate::models::{FILTER_MODE_EXCLUDE, FILTER_MODE_INCLUDE};

const EXCEL_EXTENSIONS: &[&str] = &["xlsx", "xlsm", "xltx", "xltm"];

pub fn list_excel_files(
    target_folder: impl AsRef<Path>,
    keyword: &str,
    filter_mode: &str,
) -> Result<Vec<PathBuf>, String> {
    let folder = target_folder.as_ref();
    if !folder.exists() {
        return Err(format!("目标文件夹不存在：{}", folder.display()));
    }
    if !folder.is_dir() {
        return Err(format!("目标路径不是文件夹：{}", folder.display()));
    }

    let mode = filter_mode.trim().to_ascii_lowercase();
    if mode != FILTER_MODE_INCLUDE && mode != FILTER_MODE_EXCLUDE {
        return Err("筛选模式必须是 include 或 exclude。".to_string());
    }

    let keyword = keyword.trim();
    let mut files = Vec::new();
    for entry in fs::read_dir(folder).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if file_name.starts_with("~$") {
            continue;
        }
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase();
        if !EXCEL_EXTENSIONS.contains(&extension.as_str()) {
            continue;
        }
        if !keyword.is_empty() {
            let matched = file_name.contains(keyword);
            if mode == FILTER_MODE_INCLUDE && !matched {
                continue;
            }
            if mode == FILTER_MODE_EXCLUDE && matched {
                continue;
            }
        }
        files.push(path);
    }

    files.sort_by(|left, right| {
        left.file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase()
            .cmp(
                &right
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or_default()
                    .to_ascii_lowercase(),
            )
    });
    Ok(files)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    #[test]
    fn filters_excel_files_and_keywords() {
        let root = std::env::temp_dir().join(format!(
            "excel-cell-filter-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("北京报表.xlsx"), "x").unwrap();
        fs::write(root.join("上海底稿.xlsm"), "x").unwrap();
        fs::write(root.join("~$北京报表.xlsx"), "x").unwrap();
        fs::write(root.join("说明.txt"), "x").unwrap();

        let include = list_excel_files(&root, "报表", "include").unwrap();
        assert_eq!(include[0].file_name().unwrap(), "北京报表.xlsx");

        let exclude = list_excel_files(&root, "报表", "exclude").unwrap();
        assert_eq!(exclude[0].file_name().unwrap(), "上海底稿.xlsm");

        let _ = fs::remove_dir_all(&root);
    }
}
