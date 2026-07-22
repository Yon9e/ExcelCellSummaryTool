use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
use std::collections::HashSet;
#[cfg(target_os = "windows")]
use std::io::Read;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
use std::process::{Command, Stdio};
#[cfg(target_os = "windows")]
use std::time::{Duration, Instant};

const EXCEL_EXTENSIONS: &[&str] = &["xlsx", "xlsm", "xltx", "xltm"];
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SourcePickerEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub modified_at: Option<u64>,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SourcePickerListing {
    pub current_path: String,
    pub parent_path: Option<String>,
    pub entries: Vec<SourcePickerEntry>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SourcePickerTreeEntry {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct SourcePickerNavigation {
    pub quick_access: Vec<SourcePickerTreeEntry>,
    pub common_locations: Vec<SourcePickerTreeEntry>,
    pub drives: Vec<SourcePickerTreeEntry>,
}

pub fn list_entries(requested_path: Option<&str>) -> Result<SourcePickerListing, String> {
    let requested_path = requested_path.unwrap_or_default().trim();
    if requested_path.is_empty() {
        return Ok(SourcePickerListing {
            current_path: String::new(),
            parent_path: None,
            entries: list_roots(),
        });
    }

    let directory = resolve_directory(requested_path)?;

    let mut entries = Vec::new();
    for entry in fs::read_dir(&directory)
        .map_err(|error| format!("无法读取文件夹 {}：{error}", directory.display()))?
    {
        let entry = entry.map_err(|error| format!("读取目录条目失败：{error}"))?;
        let path = entry.path();
        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };
        let is_directory = metadata.is_dir();
        if !is_directory && !is_supported_excel_file(&path) {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        if !is_directory && name.starts_with("~$") {
            continue;
        }
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
            .map(|value| value.as_secs());
        entries.push(SourcePickerEntry {
            name,
            path: path.to_string_lossy().to_string(),
            is_directory,
            modified_at,
            size: if metadata.is_file() {
                metadata.len()
            } else {
                0
            },
        });
    }

    entries.sort_by(|left, right| {
        right
            .is_directory
            .cmp(&left.is_directory)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });

    Ok(SourcePickerListing {
        current_path: directory.to_string_lossy().to_string(),
        parent_path: parent_path(&directory),
        entries,
    })
}

pub fn list_directories(
    requested_path: Option<&str>,
) -> Result<Vec<SourcePickerTreeEntry>, String> {
    let requested_path = requested_path.unwrap_or_default().trim();
    if requested_path.is_empty() {
        return Ok(list_roots()
            .into_iter()
            .map(tree_entry_from_listing)
            .collect());
    }

    let directory = resolve_directory(requested_path)?;
    let mut entries = fs::read_dir(&directory)
        .map_err(|error| format!("无法读取目录树 {}：{error}", directory.display()))?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            entry
                .metadata()
                .ok()
                .filter(|metadata| metadata.is_dir())
                .map(|_| SourcePickerTreeEntry {
                    name: entry.file_name().to_string_lossy().to_string(),
                    path: entry.path().to_string_lossy().to_string(),
                })
        })
        .collect::<Vec<_>>();
    entries.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    Ok(entries)
}

pub fn list_navigation(quick_access_script: Option<&Path>) -> SourcePickerNavigation {
    SourcePickerNavigation {
        quick_access: list_quick_access(quick_access_script),
        common_locations: list_common_locations(),
        drives: list_roots()
            .into_iter()
            .map(tree_entry_from_listing)
            .collect(),
    }
}

fn resolve_directory(requested_path: &str) -> Result<PathBuf, String> {
    let requested = PathBuf::from(requested_path);
    if !requested.exists() {
        return Err(format!("路径不存在：{}", requested.display()));
    }
    if requested.is_file() {
        return requested
            .parent()
            .map(Path::to_path_buf)
            .ok_or_else(|| format!("无法定位文件所在目录：{}", requested.display()));
    }
    if requested.is_dir() {
        return Ok(requested);
    }
    Err(format!("目标不是文件或文件夹：{}", requested.display()))
}

fn tree_entry_from_listing(entry: SourcePickerEntry) -> SourcePickerTreeEntry {
    SourcePickerTreeEntry {
        name: entry.name,
        path: entry.path,
    }
}

fn list_common_locations() -> Vec<SourcePickerTreeEntry> {
    let Some(user_profile) = std::env::var_os("USERPROFILE").map(PathBuf::from) else {
        return Vec::new();
    };
    [
        ("桌面", "Desktop"),
        ("下载", "Downloads"),
        ("文档", "Documents"),
        ("图片", "Pictures"),
    ]
    .into_iter()
    .filter_map(|(name, folder)| {
        let path = user_profile.join(folder);
        path.is_dir().then(|| SourcePickerTreeEntry {
            name: name.to_string(),
            path: path.to_string_lossy().to_string(),
        })
    })
    .collect()
}

#[cfg(target_os = "windows")]
#[derive(Debug, Deserialize)]
struct QuickAccessShellItem {
    name: String,
    path: String,
}

#[cfg(target_os = "windows")]
fn list_quick_access(script_path: Option<&Path>) -> Vec<SourcePickerTreeEntry> {
    const TIMEOUT: Duration = Duration::from_millis(1_500);
    let Some(script_path) = script_path.filter(|path| path.is_file()) else {
        return Vec::new();
    };
    let mut child = match Command::new(r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe")
        .creation_flags(quick_access_process_creation_flags())
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-STA", "-File"])
        .arg(script_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(child) => child,
        Err(_) => return Vec::new(),
    };
    let Some(mut stdout) = child.stdout.take() else {
        return Vec::new();
    };
    let output_reader = std::thread::spawn(move || {
        let mut output = String::new();
        stdout.read_to_string(&mut output).ok().map(|_| output)
    });

    let deadline = Instant::now() + TIMEOUT;
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(50)),
            Ok(None) | Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                let _ = output_reader.join();
                return Vec::new();
            }
        }
    };
    if !status.success() {
        let _ = output_reader.join();
        return Vec::new();
    }

    let Ok(Some(output)) = output_reader.join() else {
        return Vec::new();
    };
    parse_quick_access_output(&output)
}

#[cfg(target_os = "windows")]
fn quick_access_process_creation_flags() -> u32 {
    CREATE_NO_WINDOW
}

#[cfg(target_os = "windows")]
fn parse_quick_access_output(output: &str) -> Vec<SourcePickerTreeEntry> {
    let mut seen = HashSet::new();
    output
        .lines()
        .filter_map(|line| serde_json::from_str::<QuickAccessShellItem>(line).ok())
        .filter_map(|item| {
            let path = item.path.trim().to_string();
            (!path.is_empty() && Path::new(&path).is_dir() && seen.insert(path.clone())).then_some(
                SourcePickerTreeEntry {
                    name: item.name,
                    path,
                },
            )
        })
        .take(24)
        .collect()
}

#[cfg(not(target_os = "windows"))]
fn list_quick_access(_script_path: Option<&Path>) -> Vec<SourcePickerTreeEntry> {
    Vec::new()
}

fn is_supported_excel_file(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .is_some_and(|extension| EXCEL_EXTENSIONS.contains(&extension.as_str()))
}

fn parent_path(directory: &Path) -> Option<String> {
    directory
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty() && *parent != directory)
        .map(|parent| parent.to_string_lossy().to_string())
        .or_else(|| Some(String::new()))
}

#[cfg(target_os = "windows")]
fn list_roots() -> Vec<SourcePickerEntry> {
    (b'A'..=b'Z')
        .filter_map(|letter| {
            let path = PathBuf::from(format!("{}:\\", letter as char));
            path.exists().then(|| SourcePickerEntry {
                name: format!("{}: 盘", letter as char),
                path: path.to_string_lossy().to_string(),
                is_directory: true,
                modified_at: None,
                size: 0,
            })
        })
        .collect()
}

#[cfg(not(target_os = "windows"))]
fn list_roots() -> Vec<SourcePickerEntry> {
    vec![SourcePickerEntry {
        name: "/".to_string(),
        path: "/".to_string(),
        is_directory: true,
        modified_at: None,
        size: 0,
    }]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_folders_and_excel_files_in_one_page() {
        let root =
            std::env::temp_dir().join(format!("excel-source-picker-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("子目录")).unwrap();
        fs::write(root.join("报表.xlsx"), "xlsx").unwrap();
        fs::write(root.join("底稿.xlsm"), "xlsm").unwrap();
        fs::write(root.join("说明.txt"), "txt").unwrap();
        fs::write(root.join("~$临时.xlsx"), "tmp").unwrap();

        let listing = list_entries(Some(root.to_string_lossy().as_ref())).unwrap();
        assert_eq!(listing.current_path, root.to_string_lossy());
        assert_eq!(listing.entries.len(), 3);
        assert!(listing.entries[0].is_directory);
        assert_eq!(listing.entries[0].name, "子目录");
        assert!(listing
            .entries
            .iter()
            .any(|entry| entry.name == "报表.xlsx"));
        assert!(listing
            .entries
            .iter()
            .any(|entry| entry.name == "底稿.xlsm"));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn resolves_a_file_to_its_parent_directory() {
        let root = std::env::temp_dir().join(format!(
            "excel-source-picker-parent-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let file = root.join("报表.xlsx");
        fs::write(&file, "xlsx").unwrap();

        let listing = list_entries(Some(file.to_string_lossy().as_ref())).unwrap();
        assert_eq!(listing.current_path, root.to_string_lossy());

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn lists_only_directories_for_tree_children() {
        let root = std::env::temp_dir().join(format!(
            "excel-source-picker-tree-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("A目录")).unwrap();
        fs::create_dir_all(root.join("B目录")).unwrap();
        fs::write(root.join("报表.xlsx"), "xlsx").unwrap();

        let entries = list_directories(Some(root.to_string_lossy().as_ref())).unwrap();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].name, "A目录");
        assert_eq!(entries[1].name, "B目录");
        assert!(entries.iter().all(|entry| Path::new(&entry.path).is_dir()));

        let _ = fs::remove_dir_all(&root);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn navigation_only_exposes_existing_folder_paths() {
        let navigation = list_navigation(None);
        let entries = navigation
            .quick_access
            .into_iter()
            .chain(navigation.common_locations)
            .chain(navigation.drives);
        assert!(entries
            .into_iter()
            .all(|entry| Path::new(&entry.path).is_dir()));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn parses_quick_access_output_without_requiring_shell_com() {
        let root = std::env::temp_dir().join(format!(
            "excel-source-picker-quick-access-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        let item = serde_json::json!({
            "name": "固定目录",
            "path": root.to_string_lossy(),
        });
        let output = format!("{}\n{}", item, item);

        let entries = parse_quick_access_output(&output);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].name, "固定目录");
        assert_eq!(entries[0].path, root.to_string_lossy());

        let _ = fs::remove_dir_all(&root);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn quick_access_powershell_is_started_without_console_window() {
        assert_ne!(
            quick_access_process_creation_flags() & CREATE_NO_WINDOW,
            0,
            "读取快速访问不能为 powershell.exe 分配可见控制台"
        );
    }
}
