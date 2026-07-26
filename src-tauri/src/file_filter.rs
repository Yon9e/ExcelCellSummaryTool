use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

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
    let mut pending_directories = vec![target.to_path_buf()];
    let mut visited_directories = HashSet::new();
    while let Some(directory) = pending_directories.pop() {
        let canonical_directory = fs::canonicalize(&directory)
            .map_err(|error| format!("无法访问文件夹 {}：{error}", directory.display()))?;
        if !visited_directories.insert(canonical_directory) {
            continue;
        }
        for entry in fs::read_dir(&directory)
            .map_err(|error| format!("无法读取文件夹 {}：{error}", directory.display()))?
        {
            let entry = entry.map_err(|error| error.to_string())?;
            let path = entry.path();
            if path.is_dir() {
                pending_directories.push(path);
                continue;
            }
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
    }

    files.sort_by(|left, right| {
        left.to_string_lossy()
            .to_ascii_lowercase()
            .cmp(&right.to_string_lossy().to_ascii_lowercase())
    });
    Ok(files)
}

#[derive(Debug, Clone, Serialize)]
pub struct SourcePreflightResult {
    pub valid_sources: Vec<String>,
    pub duplicate_files: Vec<String>,
    pub inaccessible_sources: Vec<String>,
}

pub fn preflight_source_paths(
    paths: &[String],
    keyword: &str,
    filter_mode: &str,
) -> Result<SourcePreflightResult, String> {
    let mut occurrences: BTreeMap<String, (String, usize)> = BTreeMap::new();
    let mut valid_sources = Vec::new();
    let mut inaccessible_sources = Vec::new();
    for source in paths {
        let trimmed = source.trim();
        if trimmed.is_empty() {
            continue;
        }
        match list_excel_files(trimmed, keyword, filter_mode) {
            Ok(files) => {
                valid_sources.push(trimmed.to_string());
                for file in files {
                    let canonical = fs::canonicalize(&file).unwrap_or(file);
                    let display = canonical.to_string_lossy().to_string();
                    let key = display.to_ascii_lowercase();
                    let entry = occurrences.entry(key).or_insert((display, 0));
                    entry.1 += 1;
                }
            }
            Err(error) => inaccessible_sources.push(format!("{trimmed}：{error}")),
        }
    }
    let duplicate_files = occurrences
        .into_values()
        .filter_map(|(path, count)| (count > 1).then_some(path))
        .collect();
    Ok(SourcePreflightResult {
        valid_sources,
        duplicate_files,
        inaccessible_sources,
    })
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
        let nested = root.join("子目录").join("更深目录");
        fs::create_dir_all(&nested).unwrap();
        fs::write(nested.join("深圳报表.xltx"), "x").unwrap();

        let include = list_excel_files(&root, "报表", "include").unwrap();
        assert_eq!(include.len(), 2);
        assert_eq!(include[0].file_name().unwrap(), "北京报表.xlsx");
        assert_eq!(include[1].file_name().unwrap(), "深圳报表.xltx");

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
    #[test]
    fn preflight_reports_duplicate_when_folder_and_direct_file_overlap() {
        let root =
            std::env::temp_dir().join(format!("fadt-source-preflight-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let report = root.join("审计报告.xlsx");
        fs::write(&report, "x").unwrap();

        let result = preflight_source_paths(
            &[
                root.to_string_lossy().to_string(),
                report.to_string_lossy().to_string(),
            ],
            "",
            FILTER_MODE_INCLUDE,
        )
        .unwrap();

        assert_eq!(result.duplicate_files.len(), 1);
        assert!(result.duplicate_files[0].ends_with("审计报告.xlsx"));
        assert!(result.inaccessible_sources.is_empty());

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn preflight_keeps_accessible_sources_and_uses_current_filter() {
        let root = std::env::temp_dir().join(format!(
            "fadt-source-preflight-filter-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("匹配报表.xlsx"), "x").unwrap();
        let ignored = root.join("忽略底稿.xlsx");
        fs::write(&ignored, "x").unwrap();
        let missing = root.join("不存在");
        let root_display = root.to_string_lossy().to_string();
        let ignored_display = ignored.to_string_lossy().to_string();

        let result = preflight_source_paths(
            &[
                root_display.clone(),
                ignored_display.clone(),
                missing.to_string_lossy().to_string(),
            ],
            "匹配",
            FILTER_MODE_INCLUDE,
        )
        .unwrap();

        assert_eq!(result.valid_sources, vec![root_display, ignored_display]);
        assert_eq!(result.inaccessible_sources.len(), 1);
        assert!(result.duplicate_files.is_empty());

        let _ = fs::remove_dir_all(&root);
    }
}
