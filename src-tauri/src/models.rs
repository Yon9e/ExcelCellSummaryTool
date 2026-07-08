use serde::{Deserialize, Serialize};

pub const FILTER_MODE_INCLUDE: &str = "include";
pub const FILTER_MODE_EXCLUDE: &str = "exclude";
pub const SHEET_MODE_EXACT: &str = "exact";
pub const SHEET_MODE_CONTAINS: &str = "contains";
pub const SHEET_MODE_INDEX: &str = "index";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Rule {
    pub output_column: String,
    pub sheet_mode: String,
    pub sheet_value: String,
    pub cell: String,
}

impl Rule {
    pub fn normalized(&self) -> Self {
        Self {
            output_column: self.output_column.trim().to_string(),
            sheet_mode: self.sheet_mode.trim().to_ascii_lowercase(),
            sheet_value: self.sheet_value.trim().to_string(),
            cell: self.cell.trim().to_ascii_uppercase(),
        }
    }

    pub fn validate(&self) -> Result<Self, String> {
        let rule = self.normalized();
        if rule.output_column.is_empty() {
            return Err("输出列名不能为空。".to_string());
        }
        if !matches!(
            rule.sheet_mode.as_str(),
            SHEET_MODE_EXACT | SHEET_MODE_CONTAINS | SHEET_MODE_INDEX
        ) {
            return Err("Sheet 模式必须是 exact、contains、index 之一。".to_string());
        }
        if rule.sheet_value.is_empty() {
            return Err("Sheet 值不能为空。".to_string());
        }
        if rule.sheet_mode == SHEET_MODE_INDEX {
            let index = rule
                .sheet_value
                .parse::<usize>()
                .map_err(|_| "按序号定位 Sheet 时，Sheet 值必须是正整数。".to_string())?;
            if index == 0 {
                return Err("Sheet 序号必须大于等于 1。".to_string());
            }
        }
        if !is_valid_cell_address(&rule.cell) {
            return Err(format!("单元格地址无效：{}", rule.cell));
        }
        Ok(rule)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Scheme {
    pub name: String,
    pub target_folder: String,
    pub output_file: String,
    pub keyword: String,
    pub filter_mode: String,
    pub rules: Vec<Rule>,
}

impl Scheme {
    pub fn normalized(&self) -> Self {
        let filter_mode = match self.filter_mode.trim().to_ascii_lowercase().as_str() {
            FILTER_MODE_EXCLUDE => FILTER_MODE_EXCLUDE,
            _ => FILTER_MODE_INCLUDE,
        };
        Self {
            name: self.name.trim().to_string(),
            target_folder: self.target_folder.trim().to_string(),
            output_file: self.output_file.trim().to_string(),
            keyword: self.keyword.trim().to_string(),
            filter_mode: filter_mode.to_string(),
            rules: self.rules.iter().map(Rule::normalized).collect(),
        }
    }

    pub fn validate_name(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("方案名称不能为空。".to_string());
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SummaryRequest {
    pub target_folder: String,
    pub output_file: String,
    pub keyword: String,
    pub filter_mode: String,
    pub rules: Vec<Rule>,
    #[serde(default)]
    pub sheet_choices: Vec<SheetChoice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SummaryResult {
    pub output_path: String,
    pub total_files: usize,
    pub processed_files: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SheetChoice {
    pub file_path: String,
    pub rule_index: usize,
    pub sheet_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SheetConflict {
    pub file_path: String,
    pub file_name: String,
    pub rule_index: usize,
    pub output_column: String,
    pub sheet_value: String,
    pub matched_sheets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEvent {
    pub level: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    pub processed: usize,
    pub total: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentFileEvent {
    pub path: String,
}

pub fn validate_rules(rules: &[Rule]) -> Result<Vec<Rule>, String> {
    if rules.is_empty() {
        return Err("规则为空，不能执行汇总。".to_string());
    }
    rules
        .iter()
        .enumerate()
        .map(|(index, rule)| {
            rule.validate()
                .map_err(|error| format!("第 {} 条规则无效：{}", index + 1, error))
        })
        .collect()
}

pub fn is_valid_cell_address(cell: &str) -> bool {
    let value = cell.trim().to_ascii_uppercase();
    if value.is_empty() {
        return false;
    }

    let mut letters = String::new();
    let mut digits = String::new();
    for ch in value.chars() {
        if ch.is_ascii_alphabetic() && digits.is_empty() {
            letters.push(ch);
        } else if ch.is_ascii_digit() {
            digits.push(ch);
        } else {
            return false;
        }
    }

    if letters.is_empty() || letters.len() > 3 || digits.is_empty() {
        return false;
    }
    let Some(column) = column_index(&letters) else {
        return false;
    };
    let Ok(row) = digits.parse::<usize>() else {
        return false;
    };
    (1..=16_384).contains(&column) && (1..=1_048_576).contains(&row)
}

pub fn parse_cell_address(cell: &str) -> Result<(u32, u32), String> {
    let value = cell.trim().to_ascii_uppercase();
    if !is_valid_cell_address(&value) {
        return Err(format!("单元格地址无效：{}", cell));
    }
    let split_at = value
        .find(|ch: char| ch.is_ascii_digit())
        .ok_or_else(|| format!("单元格地址无效：{}", cell))?;
    let (letters, digits) = value.split_at(split_at);
    let column = column_index(letters).ok_or_else(|| format!("单元格地址无效：{}", cell))?;
    let row = digits
        .parse::<u32>()
        .map_err(|_| format!("单元格地址无效：{}", cell))?;
    Ok((row - 1, column as u32 - 1))
}

fn column_index(letters: &str) -> Option<usize> {
    let mut value = 0usize;
    for ch in letters.chars() {
        if !ch.is_ascii_alphabetic() {
            return None;
        }
        value = value * 26 + (ch as u8 - b'A' + 1) as usize;
    }
    Some(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_rule_and_cell_address() {
        let rule = Rule {
            output_column: " 货币资金 ".to_string(),
            sheet_mode: "EXACT".to_string(),
            sheet_value: "资产负债表".to_string(),
            cell: "b7".to_string(),
        }
        .validate()
        .unwrap();

        assert_eq!(rule.output_column, "货币资金");
        assert_eq!(rule.sheet_mode, "exact");
        assert_eq!(rule.cell, "B7");
        assert!(is_valid_cell_address("AA20"));
        assert!(!is_valid_cell_address("XFE1"));
        assert!(!is_valid_cell_address("ABC0"));
    }

    #[test]
    fn rejects_empty_rules_and_bad_index() {
        assert!(validate_rules(&[]).is_err());
        let error = validate_rules(&[Rule {
            output_column: "列".to_string(),
            sheet_mode: "index".to_string(),
            sheet_value: "abc".to_string(),
            cell: "A1".to_string(),
        }])
        .unwrap_err();
        assert!(error.contains("正整数"));
    }
}
