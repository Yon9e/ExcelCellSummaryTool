use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use chrono::Local;

use crate::app_identity::{APP_DATA_DIRECTORY, LEGACY_APP_DATA_DIRECTORY};
use crate::data_migration::write_bytes_atomically_if_missing;
use crate::models::Scheme;

pub fn load_schemes() -> Result<Vec<Scheme>, String> {
    Ok(load_schemes_map()?.into_values().collect())
}

pub fn save_scheme(scheme: Scheme, previous_name: Option<&str>) -> Result<(), String> {
    let mut scheme = scheme.normalized();
    scheme.validate_name()?;
    scheme.updated_at = Local::now().to_rfc3339();
    let mut schemes = load_schemes_map()?;
    if let Some(previous_name) = previous_name.map(str::trim).filter(|name| !name.is_empty()) {
        if previous_name != scheme.name {
            schemes.remove(previous_name);
        }
    }
    schemes.insert(scheme.name.clone(), scheme);
    write_schemes_map(&schemes)
}

pub fn delete_scheme(name: &str) -> Result<bool, String> {
    let mut schemes = load_schemes_map()?;
    let removed = schemes.remove(name).is_some();
    write_schemes_map(&schemes)?;
    Ok(removed)
}

fn load_schemes_map() -> Result<BTreeMap<String, Scheme>, String> {
    let path = schemes_path()?;
    let legacy_path = legacy_schemes_path()?;
    migrate_legacy_schemes_if_needed(&legacy_path, &path)?;
    if !path.exists() {
        return Ok(BTreeMap::new());
    }

    let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    match serde_json::from_str::<BTreeMap<String, Scheme>>(&content) {
        Ok(schemes) => Ok(schemes
            .into_iter()
            .map(|(name, scheme)| (name, scheme.normalized()))
            .collect()),
        Err(error) => {
            backup_corrupted_file(&path)?;
            write_schemes_map(&BTreeMap::new())?;
            Err(format!("方案文件已损坏，已备份并重建：{}", error))
        }
    }
}

fn write_schemes_map(schemes: &BTreeMap<String, Scheme>) -> Result<(), String> {
    let path = schemes_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let content = serde_json::to_string_pretty(schemes).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())
}

fn backup_corrupted_file(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    let backup_dir = app_data_dir()?.join("backups");
    fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let backup_path = backup_dir.join(format!("schemes_corrupted_{}.json", timestamp));
    fs::copy(path, backup_path).map_err(|error| error.to_string())?;
    Ok(())
}

fn schemes_path() -> Result<PathBuf, String> {
    Ok(app_data_dir()?.join("schemes.json"))
}

fn legacy_schemes_path() -> Result<PathBuf, String> {
    Ok(legacy_app_data_dir()?.join("schemes.json"))
}

fn migrate_legacy_schemes_if_needed(legacy_path: &Path, target_path: &Path) -> Result<(), String> {
    if target_path.exists() || !legacy_path.is_file() {
        return Ok(());
    }

    let content = fs::read_to_string(legacy_path)
        .map_err(|error| format!("读取旧版汇总方案失败：{error}"))?;
    serde_json::from_str::<BTreeMap<String, Scheme>>(&content)
        .map_err(|error| format!("旧版汇总方案格式无效，已保留原文件：{error}"))?;
    write_bytes_atomically_if_missing(target_path, content.as_bytes(), "迁移旧版汇总方案")?;
    Ok(())
}

fn app_data_dir() -> Result<PathBuf, String> {
    let base = std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .ok_or_else(|| "无法定位 APPDATA 目录。".to_string())?;
    Ok(base.join(APP_DATA_DIRECTORY))
}

fn legacy_app_data_dir() -> Result<PathBuf, String> {
    let base = std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .ok_or_else(|| "无法定位 APPDATA 目录。".to_string())?;
    Ok(base.join(LEGACY_APP_DATA_DIRECTORY))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_root(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "fadt-scheme-store-{name}-{}-{}",
            std::process::id(),
            Local::now().timestamp_nanos_opt().unwrap_or_default()
        ))
    }

    #[test]
    fn migrates_legacy_schemes_when_fadt_file_is_missing() {
        let root = test_root("migrate");
        let legacy = root.join("ExcelCellSummaryTool").join("schemes.json");
        let target = root.join("FADT").join("schemes.json");
        fs::create_dir_all(legacy.parent().unwrap()).unwrap();
        let schemes = r#"{"旧方案":{"name":"旧方案","target_folder":"","target_paths":[],"output_file":"","keyword":"","filter_mode":"include","rules":[]}}"#;
        fs::write(&legacy, schemes).unwrap();

        migrate_legacy_schemes_if_needed(&legacy, &target).unwrap();

        assert_eq!(fs::read_to_string(&target).unwrap(), schemes);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn does_not_replace_existing_fadt_schemes() {
        let root = test_root("keep-new");
        let legacy = root.join("ExcelCellSummaryTool").join("schemes.json");
        let target = root.join("FADT").join("schemes.json");
        fs::create_dir_all(legacy.parent().unwrap()).unwrap();
        fs::create_dir_all(target.parent().unwrap()).unwrap();
        fs::write(&legacy, "legacy").unwrap();
        fs::write(&target, "current").unwrap();

        migrate_legacy_schemes_if_needed(&legacy, &target).unwrap();

        assert_eq!(fs::read_to_string(&target).unwrap(), "current");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_invalid_legacy_schemes_without_creating_fadt_file() {
        let root = test_root("invalid");
        let legacy = root.join("ExcelCellSummaryTool").join("schemes.json");
        let target = root.join("FADT").join("schemes.json");
        fs::create_dir_all(legacy.parent().unwrap()).unwrap();
        fs::write(&legacy, "not-json").unwrap();

        assert!(migrate_legacy_schemes_if_needed(&legacy, &target).is_err());
        assert!(!target.exists());

        let _ = fs::remove_dir_all(root);
    }
}
