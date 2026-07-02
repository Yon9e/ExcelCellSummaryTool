"""文件筛选服务测试。"""

from pathlib import Path

import pytest

from app.services.file_filter_service import list_excel_files


def touch(path: Path) -> None:
    path.write_text("x", encoding="utf-8")


def test_filter_skips_temp_and_non_excel(tmp_path: Path) -> None:
    touch(tmp_path / "正常.xlsx")
    touch(tmp_path / "~$正常.xlsx")
    touch(tmp_path / "说明.txt")

    files = list_excel_files(tmp_path)

    assert [file.name for file in files] == ["正常.xlsx"]


def test_include_keyword(tmp_path: Path) -> None:
    touch(tmp_path / "北京报表.xlsx")
    touch(tmp_path / "上海底稿.xlsx")

    files = list_excel_files(tmp_path, keyword="报表", filter_mode="include")

    assert [file.name for file in files] == ["北京报表.xlsx"]


def test_exclude_keyword(tmp_path: Path) -> None:
    touch(tmp_path / "北京报表.xlsx")
    touch(tmp_path / "上海底稿.xlsm")

    files = list_excel_files(tmp_path, keyword="报表", filter_mode="exclude")

    assert [file.name for file in files] == ["上海底稿.xlsm"]


def test_empty_keyword_includes_all_excel(tmp_path: Path) -> None:
    touch(tmp_path / "一.xlsx")
    touch(tmp_path / "二.xlsm")
    touch(tmp_path / "三.xltx")
    touch(tmp_path / "四.xltm")

    files = list_excel_files(tmp_path, keyword="")

    assert {file.suffix for file in files} == {".xlsx", ".xlsm", ".xltx", ".xltm"}


def test_invalid_path(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        list_excel_files(tmp_path / "不存在")


def test_chinese_file_name_filter(tmp_path: Path) -> None:
    touch(tmp_path / "收入明细_中文.xlsx")
    touch(tmp_path / "成本明细_中文.xlsx")

    files = list_excel_files(tmp_path, keyword="收入", filter_mode="include")

    assert [file.name for file in files] == ["收入明细_中文.xlsx"]
