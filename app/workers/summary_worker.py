"""后台汇总 Worker。"""

from __future__ import annotations

from PySide6.QtCore import QObject, Signal, Slot

from app.models.rule import Rule
from app.services.excel_summary_service import run_summary


class SummaryWorker(QObject):
    """在 QThread 中执行汇总，避免阻塞 UI。"""

    log_signal = Signal(str)
    progress_signal = Signal(int, int)
    current_file_signal = Signal(str)
    error_signal = Signal(str)
    finished_signal = Signal(bool, str)

    def __init__(
        self,
        target_folder: str,
        output_file: str,
        keyword: str,
        filter_mode: str,
        rules: list[Rule],
    ) -> None:
        super().__init__()
        self.target_folder = target_folder
        self.output_file = output_file
        self.keyword = keyword
        self.filter_mode = filter_mode
        self.rules = rules

    @Slot()
    def run(self) -> None:
        """执行后台汇总任务。"""
        try:
            result = run_summary(
                target_folder=self.target_folder,
                output_file=self.output_file,
                keyword=self.keyword,
                filter_mode=self.filter_mode,
                rules=self.rules,
                log_callback=self._emit_log,
                progress_callback=self.progress_signal.emit,
                current_file_callback=self.current_file_signal.emit,
            )
            self.finished_signal.emit(True, str(result.output_path))
        except Exception as exc:
            message = str(exc)
            self.error_signal.emit(message)
            self.finished_signal.emit(False, message)

    def _emit_log(self, level: str, message: str) -> None:
        self.log_signal.emit(f"{level}|{message}")
