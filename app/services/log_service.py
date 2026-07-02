"""日志格式化与 debug 日志写入。"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
import traceback

from app.services.path_service import get_logs_dir


LOG_LEVELS = {"INFO", "WARN", "ERROR", "DONE"}


def format_ui_log(level: str, message: str) -> str:
    """生成 UI 日志行。"""
    clean_level = level.upper()
    if clean_level not in LOG_LEVELS:
        clean_level = "INFO"
    timestamp = datetime.now().strftime("%H:%M:%S")
    return f"[{timestamp}] [{clean_level}] {message}"


def write_debug_log(
    message: str,
    exc: BaseException | None = None,
    app_data_dir: str | Path | None = None,
) -> Path:
    """写入 debug 日志并返回日志路径。"""
    log_dir = get_logs_dir(app_data_dir)
    log_path = log_dir / f"debug_{datetime.now().strftime('%Y%m%d')}.log"
    lines = [format_ui_log("ERROR" if exc else "INFO", message)]
    if exc is not None:
        lines.append("".join(traceback.format_exception(exc)))
    with log_path.open("a", encoding="utf-8") as file:
        file.write("\n".join(lines))
        file.write("\n")
    return log_path
