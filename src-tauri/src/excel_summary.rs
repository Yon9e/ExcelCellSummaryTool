use std::fs::{File, OpenOptions};
use std::io::BufReader;
use std::path::{Path, PathBuf};

use calamine::{Data, Reader, Xlsx};
use rust_xlsxwriter::{Color, Format, Workbook, Worksheet};

use crate::file_filter::list_excel_files;
use crate::models::{
    parse_cell_address, validate_rules, LogEvent, ProgressEvent, Rule, SheetChoice, SheetConflict,
    SummaryRequest, SummaryResult, SHEET_MODE_CONTAINS, SHEET_MODE_EXACT, SHEET_MODE_INDEX,
};

#[derive(Debug, Clone)]
enum CellValue {
    Text(String),
    Number(f64),
    Bool(bool),
    Empty,
}

pub fn run_summary<FLog, FProgress, FCurrent>(
    request: SummaryRequest,
    log: FLog,
    progress: FProgress,
    current_file: FCurrent,
) -> Result<SummaryResult, String>
where
    FLog: Fn(LogEvent),
    FProgress: Fn(ProgressEvent),
    FCurrent: Fn(String),
{
    let rules = validate_rules(&request.rules)?;
    let output_path = normalize_output_path(&request.output_file)?;
    ensure_output_writable(&output_path)?;

    let files = list_excel_files(
        &request.target_folder,
        &request.keyword,
        &request.filter_mode,
    )?;
    log(LogEvent {
        level: "INFO".to_string(),
        message: format!("找到 {} 个待处理 Excel 文件。", files.len()),
    });

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    worksheet
        .set_name("汇总结果")
        .map_err(|error| error.to_string())?;
    write_headers(worksheet, &rules)?;

    let total = files.len();
    let mut processed = 0usize;
    for file_path in &files {
        processed += 1;
        current_file(file_path.to_string_lossy().to_string());
        log(LogEvent {
            level: "INFO".to_string(),
            message: format!(
                "正在处理：{}",
                file_path
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or_default()
            ),
        });
        write_file_row(
            worksheet,
            processed as u32,
            file_path,
            &rules,
            &request.sheet_choices,
            &log,
        )?;
        progress(ProgressEvent { processed, total });
    }

    worksheet.autofit();
    workbook.save(&output_path).map_err(|error| {
        format!(
            "保存输出文件失败，文件可能正在被 Excel 占用：{}；{}",
            output_path.display(),
            error
        )
    })?;
    log(LogEvent {
        level: "DONE".to_string(),
        message: format!(
            "汇总完成，输出文件：{}",
            output_path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("汇总结果.xlsx")
        ),
    });

    Ok(SummaryResult {
        output_path: output_path.to_string_lossy().to_string(),
        total_files: total,
        processed_files: processed,
    })
}

pub fn collect_sheet_conflicts(request: &SummaryRequest) -> Result<Vec<SheetConflict>, String> {
    let rules = validate_rules(&request.rules)?;
    let files = list_excel_files(
        &request.target_folder,
        &request.keyword,
        &request.filter_mode,
    )?;
    let mut conflicts = Vec::new();

    for file_path in files {
        let Ok(workbook_file) = File::open(&file_path) else {
            continue;
        };
        let Ok(workbook) = Xlsx::new(BufReader::new(workbook_file)) else {
            continue;
        };
        let sheet_names = workbook.sheet_names().to_vec();
        for (rule_index, rule) in rules.iter().enumerate() {
            if rule.sheet_mode != SHEET_MODE_CONTAINS {
                continue;
            }
            let matched_sheets: Vec<String> = sheet_names
                .iter()
                .filter(|name| name.contains(&rule.sheet_value))
                .cloned()
                .collect();
            if matched_sheets.len() > 1
                && find_sheet_choice(&request.sheet_choices, &file_path, rule_index).is_none()
            {
                conflicts.push(SheetConflict {
                    file_path: file_path.to_string_lossy().to_string(),
                    file_name: file_path
                        .file_name()
                        .and_then(|value| value.to_str())
                        .unwrap_or_default()
                        .to_string(),
                    rule_index,
                    output_column: rule.output_column.clone(),
                    sheet_value: rule.sheet_value.clone(),
                    matched_sheets,
                });
            }
        }
    }

    Ok(conflicts)
}

fn normalize_output_path(output_file: &str) -> Result<PathBuf, String> {
    let trimmed = output_file.trim();
    if trimmed.is_empty() {
        return Err("输出文件不能为空。".to_string());
    }
    let mut output_path = PathBuf::from(trimmed);
    if output_path.extension().is_none() {
        output_path.set_extension("xlsx");
    }
    if !output_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .eq_ignore_ascii_case("xlsx")
    {
        output_path.set_extension("xlsx");
    }
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    Ok(output_path)
}

fn ensure_output_writable(output_path: &Path) -> Result<(), String> {
    if output_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .starts_with("~$")
    {
        return Err("输出文件是 Excel 临时文件，请选择正常 .xlsx 文件。".to_string());
    }
    OpenOptions::new()
        .create(true)
        .append(true)
        .open(output_path)
        .map(|_| ())
        .map_err(|error| format!("输出文件可能正在被 Excel 占用，请关闭后重试：{}", error))
}

fn write_headers(worksheet: &mut Worksheet, rules: &[Rule]) -> Result<(), String> {
    let header_format = Format::new()
        .set_bold()
        .set_font_color(Color::RGB(0x1F2937))
        .set_background_color(Color::RGB(0xE8EEF7));
    let mut headers = vec!["文件名".to_string()];
    headers.extend(rules.iter().map(|rule| rule.output_column.clone()));
    for (column, header) in headers.iter().enumerate() {
        worksheet
            .write_string_with_format(0, column as u16, header, &header_format)
            .map_err(|error| error.to_string())?;
    }
    worksheet
        .set_freeze_panes(1, 0)
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn write_file_row<FLog>(
    worksheet: &mut Worksheet,
    row: u32,
    file_path: &Path,
    rules: &[Rule],
    sheet_choices: &[SheetChoice],
    log: &FLog,
) -> Result<(), String>
where
    FLog: Fn(LogEvent),
{
    let file_name = file_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    let file_link = source_file_hyperlink(file_path);
    worksheet
        .write_url_with_text(row, 0, file_link.as_str(), file_name)
        .map_err(|error| error.to_string())?;

    let values = read_file_values(file_path, rules, sheet_choices, log);
    for (index, value) in values.into_iter().enumerate() {
        write_cell_value(worksheet, row, (index + 1) as u16, value)?;
    }
    Ok(())
}

fn source_file_hyperlink(file_path: &Path) -> String {
    format!("file:///{}", file_path.to_string_lossy())
}

fn read_file_values<FLog>(
    file_path: &Path,
    rules: &[Rule],
    sheet_choices: &[SheetChoice],
    log: &FLog,
) -> Vec<CellValue>
where
    FLog: Fn(LogEvent),
{
    let workbook_file = match File::open(file_path) {
        Ok(file) => file,
        Err(error) => {
            log(LogEvent {
                level: "ERROR".to_string(),
                message: format!(
                    "读取失败，文件可能被占用：{}；{}",
                    file_path.display(),
                    error
                ),
            });
            return vec![CellValue::Empty; rules.len()];
        }
    };

    let mut workbook = match Xlsx::new(BufReader::new(workbook_file)) {
        Ok(workbook) => workbook,
        Err(error) => {
            log(LogEvent {
                level: "ERROR".to_string(),
                message: format!("读取失败：{}；{}", file_path.display(), error),
            });
            return vec![CellValue::Empty; rules.len()];
        }
    };

    rules
        .iter()
        .enumerate()
        .map(|(rule_index, rule)| {
            read_rule_value(
                &mut workbook,
                rule_index,
                rule,
                file_path,
                sheet_choices,
                log,
            )
        })
        .collect()
}

fn read_rule_value<FLog, R>(
    workbook: &mut Xlsx<R>,
    rule_index: usize,
    rule: &Rule,
    file_path: &Path,
    sheet_choices: &[SheetChoice],
    log: &FLog,
) -> CellValue
where
    R: std::io::Read + std::io::Seek,
    FLog: Fn(LogEvent),
{
    let sheet_names = workbook.sheet_names().to_vec();
    let Some(sheet_name) = locate_sheet(&sheet_names, rule_index, rule, file_path, sheet_choices)
    else {
        log(LogEvent {
            level: "WARN".to_string(),
            message: format!(
                "{} 未找到 Sheet：模式={}，值={}",
                file_path
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or_default(),
                rule.sheet_mode,
                rule.sheet_value
            ),
        });
        return CellValue::Empty;
    };

    let range = match workbook.worksheet_range(&sheet_name) {
        Ok(range) => range,
        Err(error) => {
            log(LogEvent {
                level: "WARN".to_string(),
                message: format!("读取 Sheet 失败：{}；{}", sheet_name, error),
            });
            return CellValue::Empty;
        }
    };

    let Ok((row, column)) = parse_cell_address(&rule.cell) else {
        return CellValue::Empty;
    };
    match range.get_value((row, column)) {
        Some(data) => data_to_cell_value(data),
        None => CellValue::Empty,
    }
}

fn locate_sheet(
    sheet_names: &[String],
    rule_index: usize,
    rule: &Rule,
    file_path: &Path,
    sheet_choices: &[SheetChoice],
) -> Option<String> {
    if let Some(choice) = find_sheet_choice(sheet_choices, file_path, rule_index) {
        if sheet_names.iter().any(|name| name == &choice.sheet_name) {
            return Some(choice.sheet_name.clone());
        }
    }
    match rule.sheet_mode.as_str() {
        SHEET_MODE_EXACT => sheet_names
            .iter()
            .find(|name| name.as_str() == rule.sheet_value)
            .cloned(),
        SHEET_MODE_CONTAINS => sheet_names
            .iter()
            .find(|name| name.contains(&rule.sheet_value))
            .cloned(),
        SHEET_MODE_INDEX => {
            let index = rule.sheet_value.parse::<usize>().ok()?.checked_sub(1)?;
            sheet_names.get(index).cloned()
        }
        _ => None,
    }
}

fn find_sheet_choice<'a>(
    sheet_choices: &'a [SheetChoice],
    file_path: &Path,
    rule_index: usize,
) -> Option<&'a SheetChoice> {
    let file_path = file_path.to_string_lossy();
    sheet_choices
        .iter()
        .find(|choice| choice.rule_index == rule_index && choice.file_path == file_path)
}

fn data_to_cell_value(data: &Data) -> CellValue {
    match data {
        Data::Empty => CellValue::Empty,
        Data::String(value) => CellValue::Text(value.clone()),
        Data::Float(value) => CellValue::Number(*value),
        Data::Int(value) => CellValue::Number(*value as f64),
        Data::Bool(value) => CellValue::Bool(*value),
        Data::Error(value) => CellValue::Text(format!("{value:?}")),
        Data::DateTime(value) => CellValue::Text(value.to_string()),
        Data::DateTimeIso(value) => CellValue::Text(value.clone()),
        Data::DurationIso(value) => CellValue::Text(value.clone()),
    }
}

fn write_cell_value(
    worksheet: &mut Worksheet,
    row: u32,
    column: u16,
    value: CellValue,
) -> Result<(), String> {
    match value {
        CellValue::Text(value) => {
            worksheet
                .write_string(row, column, &value)
                .map_err(|error| error.to_string())?;
            Ok(())
        }
        CellValue::Number(value) => {
            worksheet
                .write_number(row, column, value)
                .map_err(|error| error.to_string())?;
            Ok(())
        }
        CellValue::Bool(value) => {
            worksheet
                .write_boolean(row, column, value)
                .map_err(|error| error.to_string())?;
            Ok(())
        }
        CellValue::Empty => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;
    use crate::models::{FILTER_MODE_INCLUDE, SHEET_MODE_CONTAINS, SHEET_MODE_EXACT};

    #[test]
    fn creates_hyperlink_to_source_workbook() {
        assert_eq!(
            source_file_hyperlink(Path::new(r"D:\报表\北京报表.xlsx")),
            r"file:///D:\报表\北京报表.xlsx"
        );
    }

    #[test]
    fn summarizes_xlsx_cells_to_output_workbook() {
        let root =
            std::env::temp_dir().join(format!("excel-summary-e2e-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();

        let input_path = root.join("北京报表.xlsx");
        let mut input_workbook = Workbook::new();
        let input_sheet = input_workbook.add_worksheet();
        input_sheet.set_name("资产负债表").unwrap();
        input_sheet.write_number(6, 1, 123.45).unwrap();
        input_workbook.save(&input_path).unwrap();

        let output_path = root.join("汇总结果.xlsx");
        let request = SummaryRequest {
            target_folder: root.to_string_lossy().to_string(),
            output_file: output_path.to_string_lossy().to_string(),
            keyword: "报表".to_string(),
            filter_mode: FILTER_MODE_INCLUDE.to_string(),
            rules: vec![Rule {
                output_column: "货币资金".to_string(),
                sheet_mode: SHEET_MODE_EXACT.to_string(),
                sheet_value: "资产负债表".to_string(),
                cell: "B7".to_string(),
            }],
            sheet_choices: Vec::new(),
        };

        let result = run_summary(request, |_| {}, |_| {}, |_| {}).unwrap();
        assert_eq!(result.total_files, 1);
        assert_eq!(result.processed_files, 1);
        assert!(output_path.exists());

        let output_file = File::open(&output_path).unwrap();
        let mut output_workbook = Xlsx::new(BufReader::new(output_file)).unwrap();
        let range = output_workbook.worksheet_range("汇总结果").unwrap();
        assert_eq!(
            range.get_value((0, 0)),
            Some(&Data::String("文件名".to_string()))
        );
        assert_eq!(
            range.get_value((0, 1)),
            Some(&Data::String("货币资金".to_string()))
        );
        assert_eq!(range.get_value((0, 2)), None);
        assert_eq!(range.get_value((1, 1)), Some(&Data::Float(123.45)));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn reports_multiple_contains_sheet_matches_before_summary() {
        let root = std::env::temp_dir().join(format!(
            "excel-summary-conflict-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();

        let input_path = root.join("多表报表.xlsx");
        let mut input_workbook = Workbook::new();
        let first = input_workbook.add_worksheet();
        first.set_name("利润表").unwrap();
        first.write_number(0, 0, 10.0).unwrap();
        let second = input_workbook.add_worksheet();
        second.set_name("合并利润表").unwrap();
        second.write_number(0, 0, 20.0).unwrap();
        input_workbook.save(&input_path).unwrap();

        let request = SummaryRequest {
            target_folder: root.to_string_lossy().to_string(),
            output_file: root.join("汇总.xlsx").to_string_lossy().to_string(),
            keyword: "报表".to_string(),
            filter_mode: FILTER_MODE_INCLUDE.to_string(),
            rules: vec![Rule {
                output_column: "营业收入".to_string(),
                sheet_mode: SHEET_MODE_CONTAINS.to_string(),
                sheet_value: "利润".to_string(),
                cell: "A1".to_string(),
            }],
            sheet_choices: Vec::new(),
        };

        let conflicts = collect_sheet_conflicts(&request).unwrap();
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].rule_index, 0);
        assert_eq!(conflicts[0].matched_sheets, vec!["利润表", "合并利润表"]);

        let _ = fs::remove_dir_all(&root);
    }
}
