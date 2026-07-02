"""应用入口。"""

from __future__ import annotations

from pathlib import Path
import sys

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ui.main_window import MainWindow
from app.ui.styles import apply_desktop_theme


def main() -> int:
    """启动 PySide6 应用。"""
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )
    app = QApplication(sys.argv)
    app.setApplicationName("Excel 单元格定向汇总工具")
    app.setOrganizationName("ExcelCellSummaryTool")
    apply_desktop_theme(app)
    window = MainWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
