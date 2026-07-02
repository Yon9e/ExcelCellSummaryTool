"""应用路径服务。"""

from __future__ import annotations

import os
from pathlib import Path


APP_NAME = "ExcelCellSummaryTool"


def get_app_data_dir(base_dir: str | Path | None = None) -> Path:
    """获取并创建应用数据目录。"""
    if base_dir is None:
        root = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
        app_dir = root / APP_NAME
    else:
        app_dir = Path(base_dir)
    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir


def get_schemes_path(base_dir: str | Path | None = None) -> Path:
    """获取方案 JSON 文件路径。"""
    return get_app_data_dir(base_dir) / "schemes.json"


def get_logs_dir(base_dir: str | Path | None = None) -> Path:
    """获取日志目录。"""
    path = get_app_data_dir(base_dir) / "logs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_backups_dir(base_dir: str | Path | None = None) -> Path:
    """获取损坏配置备份目录。"""
    path = get_app_data_dir(base_dir) / "backups"
    path.mkdir(parents=True, exist_ok=True)
    return path
