"""应用 QSS 样式。"""

from __future__ import annotations

from typing import Any


APP_STYLE = """
* {
    font-family: "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", sans-serif;
}
QMainWindow {
    background: #070b18;
    color: #e7edf8;
    font-size: 10.5pt;
}
QWidget#centralwidget {
    background: #070b18;
}
QFrame#sidebarFrame,
QFrame#headerFrame,
QFrame#schemeGroupBox,
QFrame#sourceGroupBox,
QFrame#rulesGroupBox,
QFrame#logGroupBox {
    background: #111a2c;
    border: 1px solid #263755;
    border-radius: 8px;
}
QFrame#contentFrame {
    background: transparent;
}
QStackedWidget#contentStack {
    background: transparent;
    border: 0;
}
QLabel#sidebarTitleLabel {
    color: #f7fbff;
    font-size: 15pt;
    font-weight: 800;
}
QLabel#sidebarSubtitleLabel,
QLabel#sidebarHintLabel,
QLabel#subtitleLabel,
QLabel#currentFileLabel,
QLabel#countLabel,
QLabel#schemeSectionHintLabel,
QLabel#sourceSectionHintLabel,
QLabel#rulesSectionHintLabel {
    color: #9aa8c1;
}
QLabel#sidebarHintLabel {
    line-height: 150%;
}
QLabel#titleLabel {
    color: #f8fbff;
    font-size: 19pt;
    font-weight: 800;
}
QLabel#schemeSectionTitleLabel,
QLabel#sourceSectionTitleLabel,
QLabel#rulesSectionTitleLabel,
QLabel#logSectionTitleLabel {
    color: #f8fbff;
    font-size: 13pt;
    font-weight: 800;
}
QLabel {
    color: #dbe6f7;
}
QPushButton {
    min-height: 34px;
    background: #18243a;
    border: 1px solid #2b3d5e;
    border-radius: 8px;
    padding: 7px 13px;
    color: #e6edf8;
    font-weight: 600;
}
QPushButton:hover {
    background: #21324f;
    border-color: #4dd0e1;
}
QPushButton:pressed {
    background: #152238;
}
QPushButton:disabled {
    color: #64738d;
    background: #11192a;
    border-color: #22314c;
}
QPushButton#navSourceButton,
QPushButton#navRulesButton,
QPushButton#navSchemeButton,
QPushButton#navRunButton {
    text-align: left;
    padding-left: 18px;
    background: #142139;
}
QPushButton#navSchemeButton[active="true"],
QPushButton#navSourceButton[active="true"],
QPushButton#navRulesButton[active="true"],
QPushButton#navRunButton[active="true"],
QPushButton#startButton {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #4dd0e1, stop:1 #5d9cec);
    color: #06111f;
    border-color: #72e5f2;
    font-weight: 800;
}
QPushButton#navSchemeButton[active="true"]:hover,
QPushButton#navSourceButton[active="true"]:hover,
QPushButton#navRulesButton[active="true"]:hover,
QPushButton#navRunButton[active="true"]:hover,
QPushButton#startButton:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #6ae4f1, stop:1 #7ab6ff);
}
QPushButton#deleteSchemeButton,
QPushButton#deleteRuleButton {
    color: #ffd7dd;
    border-color: #7b3342;
    background: #241726;
}
QPushButton#deleteSchemeButton:hover,
QPushButton#deleteRuleButton:hover {
    color: #ffffff;
    border-color: #ff7b91;
    background: #3a1c2b;
}
QLineEdit,
QComboBox,
QPlainTextEdit,
QTextBrowser {
    min-height: 34px;
    background: #0d1526;
    border: 1px solid #2b3d5e;
    border-radius: 8px;
    padding: 6px 9px;
    color: #e7edf8;
    selection-background-color: #4dd0e1;
    selection-color: #06111f;
}
QLineEdit:focus,
QComboBox:focus,
QPlainTextEdit:focus,
QTextBrowser:focus {
    border-color: #4dd0e1;
    background: #101b31;
}
QComboBox::drop-down {
    width: 28px;
    border: 0;
    border-left: 1px solid #2b3d5e;
}
QComboBox QAbstractItemView {
    background: #101b31;
    border: 1px solid #2b3d5e;
    outline: 0;
    color: #e7edf8;
    selection-background-color: #2a7abf;
}
QTableWidget#rulesTable {
    background: #0d1526;
    alternate-background-color: #101b31;
    color: #dce7f6;
    border: 1px solid #263755;
    border-radius: 8px;
    gridline-color: #263755;
    selection-background-color: #234e77;
    selection-color: #ffffff;
}
QTableWidget#rulesTable::item {
    padding: 6px 8px;
    border: 0;
}
QTableWidget#rulesTable::item:selected {
    background: #234e77;
    color: #ffffff;
}
QHeaderView {
    background: #16233b;
}
QHeaderView::section {
    background: #16233b;
    color: #f1f6ff;
    padding: 8px 10px;
    border: 0;
    border-right: 1px solid #263755;
    border-bottom: 1px solid #263755;
    font-weight: 800;
}
QTableCornerButton::section {
    background: #16233b;
    border: 0;
    border-right: 1px solid #263755;
    border-bottom: 1px solid #263755;
}
QPlainTextEdit#logConsole {
    min-height: 126px;
    background: #070d1a;
    border-color: #263755;
    color: #c8d7ea;
    font-family: "Cascadia Mono", "Consolas", monospace;
    font-size: 9.6pt;
}
QProgressBar {
    border: 1px solid #263755;
    border-radius: 8px;
    background: #0d1526;
    color: #dbe6f7;
    text-align: center;
    height: 16px;
}
QProgressBar::chunk {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #4dd0e1, stop:1 #5d9cec);
    border-radius: 7px;
}
QScrollBar:vertical,
QScrollBar:horizontal {
    background: #0b1222;
    border: 0;
    margin: 0;
}
QScrollBar::handle:vertical,
QScrollBar::handle:horizontal {
    background: #2a3d5d;
    border-radius: 5px;
    min-height: 28px;
    min-width: 28px;
}
QScrollBar::handle:vertical:hover,
QScrollBar::handle:horizontal:hover {
    background: #4dd0e1;
}
QScrollBar::add-line,
QScrollBar::sub-line {
    width: 0;
    height: 0;
}
QStatusBar {
    background: #070b18;
    color: #9aa8c1;
    border-top: 1px solid #1c2a43;
}
QMessageBox {
    background: #111a2c;
    color: #e7edf8;
}
"""


def apply_desktop_theme(app: Any) -> None:
    """应用 qt-material 深色主题，并叠加本项目样式。"""
    from PySide6.QtGui import QFont

    app.setFont(QFont("Microsoft YaHei UI", 10))
    try:
        from qt_material import apply_stylesheet

        apply_stylesheet(app, theme="dark_cyan.xml", style="Fusion")
    except Exception:
        app.setStyle("Fusion")
    app.setFont(QFont("Microsoft YaHei UI", 10))
    app.setStyleSheet(f"{app.styleSheet()}\n{APP_STYLE}")
