use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

use chrono::Local;

use crate::models::Scheme;

pub fn load_schemes() -> Result<Vec<Scheme>, String> {
    Ok(load_schemes_map()?.into_values().collect())
}

pub fn save_scheme(scheme: Scheme, previous_name: Option<&str>) -> Result<(), String> {
    let mut scheme = scheme.normalized();
    scheme.validate_name()?;
    scheme.updated_at = Local::now().to_rfc3339();
    let mut schemes = load_schemes_map().unwrap_or_default();
    if let Some(previous_name) = previous_name.map(str::trim).filter(|name| !name.is_empty()) {
        if previous_name != scheme.name {
            schemes.remove(previous_name);
        }
    }
    schemes.insert(scheme.name.clone(), scheme);
    write_schemes_map(&schemes)
}

pub fn delete_scheme(name: &str) -> Result<bool, String> {
    let mut schemes = load_schemes_map().unwrap_or_default();
    let removed = schemes.remove(name).is_some();
    write_schemes_map(&schemes)?;
    Ok(removed)
}

fn load_schemes_map() -> Result<BTreeMap<String, Scheme>, String> {
    let path = schemes_path()?;
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

fn app_data_dir() -> Result<PathBuf, String> {
    let base = std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .ok_or_else(|| "无法定位 APPDATA 目录。".to_string())?;
    Ok(base.join("ExcelCellSummaryTool"))
}
