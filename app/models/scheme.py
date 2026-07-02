"""方案模型。"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.models.rule import Rule


FILTER_MODES = {"include", "exclude"}


@dataclass
class Scheme:
    """用户保存的汇总方案。"""

    name: str
    target_folder: str = ""
    output_file: str = ""
    keyword: str = ""
    filter_mode: str = "include"
    rules: list[Rule] = field(default_factory=list)

    def normalized(self) -> "Scheme":
        """返回字段规范化后的方案。"""
        mode = self.filter_mode.strip().lower()
        if mode not in FILTER_MODES:
            mode = "include"
        return Scheme(
            name=self.name.strip(),
            target_folder=self.target_folder.strip(),
            output_file=self.output_file.strip(),
            keyword=self.keyword.strip(),
            filter_mode=mode,
            rules=[rule.normalized() for rule in self.rules],
        )

    def validate_name(self) -> None:
        """校验方案名称。"""
        if not self.name.strip():
            raise ValueError("方案名称不能为空。")

    def to_dict(self) -> dict[str, Any]:
        """转换为可写入 JSON 的字典。"""
        scheme = self.normalized()
        return {
            "name": scheme.name,
            "target_folder": scheme.target_folder,
            "output_file": scheme.output_file,
            "keyword": scheme.keyword,
            "filter_mode": scheme.filter_mode,
            "rules": [rule.to_dict() for rule in scheme.rules],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Scheme":
        """从字典创建方案。"""
        raw_rules = data.get("rules", [])
        rules = [
            Rule.from_dict(item)
            for item in raw_rules
            if isinstance(item, dict)
        ]
        return cls(
            name=str(data.get("name", "")),
            target_folder=str(data.get("target_folder", "")),
            output_file=str(data.get("output_file", "")),
            keyword=str(data.get("keyword", "")),
            filter_mode=str(data.get("filter_mode", "include")),
            rules=rules,
        ).normalized()
