"""定向取数规则模型与校验。"""

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any

from openpyxl.utils.cell import column_index_from_string, coordinate_from_string


SHEET_MODES = {"exact", "contains", "index"}
CELL_RE = re.compile(r"^[A-Z]{1,3}[1-9][0-9]{0,6}$", re.IGNORECASE)


@dataclass
class Rule:
    """Excel 单元格定向取数规则。"""

    output_column: str
    sheet_mode: str
    sheet_value: str
    cell: str

    def normalized(self) -> "Rule":
        """返回去除空白并规范大小写后的规则。"""
        return Rule(
            output_column=self.output_column.strip(),
            sheet_mode=self.sheet_mode.strip().lower(),
            sheet_value=str(self.sheet_value).strip(),
            cell=self.cell.strip().upper(),
        )

    def validate(self) -> None:
        """校验规则完整性和单元格格式。"""
        rule = self.normalized()
        if not rule.output_column:
            raise ValueError("输出列名不能为空。")
        if rule.sheet_mode not in SHEET_MODES:
            raise ValueError("Sheet 模式必须是 exact、contains、index 之一。")
        if not rule.sheet_value:
            raise ValueError("Sheet 值不能为空。")
        if rule.sheet_mode == "index":
            try:
                index_value = int(rule.sheet_value)
            except ValueError as exc:
                raise ValueError("按序号定位 Sheet 时，Sheet 值必须是正整数。") from exc
            if index_value < 1:
                raise ValueError("Sheet 序号必须大于等于 1。")
        if not is_valid_cell_address(rule.cell):
            raise ValueError(f"单元格地址无效：{rule.cell}")

    def to_dict(self) -> dict[str, str]:
        """转换为可写入 JSON 的字典。"""
        rule = self.normalized()
        return {
            "output_column": rule.output_column,
            "sheet_mode": rule.sheet_mode,
            "sheet_value": rule.sheet_value,
            "cell": rule.cell,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Rule":
        """从字典创建规则。"""
        return cls(
            output_column=str(data.get("output_column", "")),
            sheet_mode=str(data.get("sheet_mode", "")),
            sheet_value=str(data.get("sheet_value", "")),
            cell=str(data.get("cell", "")),
        ).normalized()


def is_valid_cell_address(cell: str) -> bool:
    """判断是否为 Excel 合法单元格地址。"""
    value = cell.strip().upper()
    if not CELL_RE.match(value):
        return False
    try:
        column, row = coordinate_from_string(value)
        column_index = column_index_from_string(column)
    except ValueError:
        return False
    return 1 <= column_index <= 16384 and 1 <= row <= 1048576


def validate_rules(rules: list[Rule]) -> list[Rule]:
    """校验规则列表并返回规范化后的规则。"""
    if not rules:
        raise ValueError("规则为空，不能执行汇总。")
    normalized_rules = [rule.normalized() for rule in rules]
    for index, rule in enumerate(normalized_rules, start=1):
        try:
            rule.validate()
        except ValueError as exc:
            raise ValueError(f"第 {index} 条规则无效：{exc}") from exc
    return normalized_rules
