"""规则模型测试。"""

import pytest

from app.models.rule import Rule, is_valid_cell_address, validate_rules


def test_rule_create_and_validate() -> None:
    rule = Rule("货币资金", "exact", "资产负债表", "b7")
    normalized = validate_rules([rule])[0]
    assert normalized.output_column == "货币资金"
    assert normalized.sheet_mode == "exact"
    assert normalized.cell == "B7"


def test_invalid_cell_address() -> None:
    assert not is_valid_cell_address("ABC0")
    assert not is_valid_cell_address("XFE1")
    assert is_valid_cell_address("AA20")


def test_empty_rules_forbidden() -> None:
    with pytest.raises(ValueError, match="规则为空"):
        validate_rules([])


def test_invalid_sheet_index() -> None:
    with pytest.raises(ValueError, match="正整数"):
        validate_rules([Rule("列", "index", "abc", "A1")])


def test_missing_output_column() -> None:
    with pytest.raises(ValueError, match="输出列名不能为空"):
        validate_rules([Rule("", "exact", "Sheet1", "A1")])
