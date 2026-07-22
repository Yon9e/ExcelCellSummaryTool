use std::fs;
use std::path::{Path, PathBuf};

use crate::models::{FILTER_MODE_EXCLUDE, FILTER_MODE_INCLUDE};

const EXCEL_EXTENSIONS: &[&str] = &["xlsx", "xlsm", "xltx", "xltm"];

pub fn list_excel_files(
    target_path: impl AsRef<Path>,
    keyword: &str,
    filter_mode: &str,
) -> Result<Vec<PathBuf>, String> {
    let target = target_path.as_ref();
    if !target.exists() {
        return Err(format!("目标文件或文件夹不存在：{}", target.display()));
    }

    if target.is_file() {
        return validate_selected_excel_file(target).map(|path| vec![path]);
    }
    if !target.is_dir() {
        return Err(format!("目标路径不是文件或文件夹：{}", target.display()));
    }

    let mode = filter_mode.trim().to_ascii_lowercase();
    if mode != FILTER_MODE_INCLUDE && mode != FILTER_MODE_EXCLUDE {
        return Err("筛选模式必须是 include 或 exclude。".to_string());
    }

    let keyword = keyword.trim();
    let mut files = Vec::new();
    for entry in fs::read_dir(target).map_err(|error| error.to_string())? {
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

fn validate_selected_excel_file(path: &Path) -> Result<PathBuf, String> {
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    if file_name.starts_with("~$") {
        return Err("不能选择 Excel 临时文件。".to_string());
    }
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !EXCEL_EXTENSIONS.contains(&extension.as_str()) {
        return Err("目标文件仅支持 .xlsx、.xlsm、.xltx、.xltm 格式。".to_string());
    }
    Ok(path.to_path_buf())
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    #[test]
    fn filters_excel_files_and_keywords() {
        let root =
            std::env::temp_dir().join(format!("excel-cell-filter-test-{}", std::process::id()));
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

        let selected_file =
            list_excel_files(root.join("北京报表.xlsx"), "不匹配", "include").unwrap();
        assert_eq!(selected_file.len(), 1);
        assert_eq!(selected_file[0].file_name().unwrap(), "北京报表.xlsx");

        let unsupported = list_excel_files(root.join("说明.txt"), "", "include").unwrap_err();
        assert!(unsupported.contains("仅支持"));

        let _ = fs::remove_dir_all(&root);
    }
}
