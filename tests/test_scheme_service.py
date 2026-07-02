"""方案服务测试。"""

from pathlib import Path

import pytest

from app.models.rule import Rule
from app.models.scheme import Scheme
from app.services.scheme_service import SchemeService


def test_save_and_load_scheme(tmp_path: Path) -> None:
    service = SchemeService(tmp_path)
    scheme = Scheme(
        name="审计方案",
        target_folder=r"D:\Data",
        output_file=r"D:\Out\汇总.xlsx",
        keyword="报表",
        filter_mode="include",
        rules=[Rule("货币资金", "exact", "资产负债表", "B7")],
    )

    service.save(scheme)
    loaded = service.get("审计方案")

    assert loaded is not None
    assert loaded.name == "审计方案"
    assert loaded.rules[0].output_column == "货币资金"


def test_delete_scheme(tmp_path: Path) -> None:
    service = SchemeService(tmp_path)
    service.save(Scheme(name="临时方案"))

    assert service.delete("临时方案") is True
    assert service.get("临时方案") is None


def test_corrupted_json_is_backed_up(tmp_path: Path) -> None:
    service = SchemeService(tmp_path)
    service.schemes_path.write_text("{损坏 JSON", encoding="utf-8")

    with pytest.raises(ValueError, match="方案文件已损坏"):
        service.load_all()

    backups = list((tmp_path / "backups").glob("schemes_corrupted_*.json"))
    assert len(backups) == 1
    assert service.schemes_path.read_text(encoding="utf-8").strip() == "{}"
