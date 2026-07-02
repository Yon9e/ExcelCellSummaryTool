"""应用 QSS 样式。"""

from __future__ import annotations

from typing import Any


APP_STYLE = """
* {
    font-family: "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", sans-serif;
}
QMainWindow {
    background: #0a1320;
    color: #edf4ff;
    font-size: 11pt;
}
QWidget#centralwidget {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #172640, stop:0.42 #101c2d, stop:1 #0c2530);
}
QFrame#sidebarFrame {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #172949, stop:0.55 #15243b, stop:1 #111d2e);
    border: 0;
    border-right: 1px solid #263a5a;
    border-radius: 0;
}
QFrame#headerFrame {
    background: transparent;
    border: 0;
    border-radius: 0;
}
QFrame#schemeGroupBox,
QFrame#sourceGroupBox,
QFrame#rulesGroupBox,
QFrame#logGroupBox {
    background: transparent;
    border: 0;
    border-radius: 0;
}
QFrame#contentFrame {
    background: transparent;
}
QStackedWidget#contentStack {
    background: transparent;
    border: 0;
}
QLabel#sidebarTitleLabel {
    color: #ffffff;
    font-size: 16pt;
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
    color: #b6c6dc;
}
QLabel#sidebarHintLabel {
    background: rgba(19, 34, 55, 0.78);
    border: 1px solid #2e466a;
    border-radius: 8px;
    padding: 10px 12px;
    line-height: 150%;
}
QLabel#titleLabel {
    color: #ffffff;
    font-size: 22pt;
    font-weight: 800;
}
QLabel#schemeSectionTitleLabel,
QLabel#sourceSectionTitleLabel,
QLabel#rulesSectionTitleLabel,
QLabel#logSectionTitleLabel {
    color: #ffffff;
    font-size: 15pt;
    font-weight: 800;
}
QLabel {
    color: #edf4ff;
}
QPushButton {
    min-height: 36px;
    background: rgba(25, 39, 61, 0.78);
    border: 1px solid #344966;
    border-radius: 8px;
    padding: 8px 14px;
    color: #f2f6ff;
    font-weight: 700;
}
QPushButton:hover {
    background: #223653;
    border-color: #5d8fd9;
}
QPushButton:pressed {
    background: #132235;
}
QPushButton:disabled {
    color: #76869c;
    background: rgba(19, 29, 44, 0.7);
    border-color: #27364c;
}
QPushButton#navSourceButton,
QPushButton#navRulesButton,
QPushButton#navSchemeButton,
QPushButton#navRunButton {
    text-align: left;
    padding-left: 20px;
    min-height: 42px;
    background: transparent;
    border: 1px solid transparent;
    color: #b8c6dc;
    font-size: 11pt;
}
QPushButton#navSchemeButton[active="true"],
QPushButton#navSourceButton[active="true"],
QPushButton#navRulesButton[active="true"],
QPushButton#navRunButton[active="true"] {
    background: #1f3a66;
    color: #58a3ff;
    border-color: #264a7d;
    font-weight: 800;
}
QPushButton#startButton {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #4fd5b7, stop:0.52 #45c4e8, stop:1 #4e8ff5);
    color: #031312;
    border-color: #70d8ec;
    font-weight: 800;
}
QPushButton#navSchemeButton[active="true"],
QPushButton#navSourceButton[active="true"],
QPushButton#navRulesButton[active="true"],
QPushButton#navRunButton[active="true"] {
    border-left: 3px solid #58a3ff;
    padding-left: 17px;
}
QPushButton#navSchemeButton[active="true"]:hover,
QPushButton#navSourceButton[active="true"]:hover,
QPushButton#navRulesButton[active="true"]:hover,
QPushButton#navRunButton[active="true"]:hover,
QPushButton#startButton:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #62e2c7, stop:0.55 #60d6f3, stop:1 #72a9ff);
}
QPushButton#startButton {
    min-height: 42px;
}
QPushButton#deleteSchemeButton,
QPushButton#deleteRuleButton {
    color: #ffdfe4;
    border-color: #7a3545;
    background: rgba(47, 22, 34, 0.78);
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
    min-height: 38px;
    background: rgba(12, 21, 34, 0.82);
    border: 1px solid #334763;
    border-radius: 8px;
    padding: 7px 10px;
    color: #f0f6ff;
    selection-background-color: #4e8ff5;
    selection-color: #ffffff;
}
QLineEdit::placeholder {
    color: #8fa1b8;
}
QLineEdit:focus,
QComboBox:focus,
QPlainTextEdit:focus,
QTextBrowser:focus {
    border-color: #66a6ff;
    background: #111f32;
}
QComboBox::drop-down {
    width: 28px;
    border: 0;
    border-left: 1px solid #2b3d5e;
}
QComboBox QAbstractItemView {
    background: #111f32;
    border: 1px solid #344966;
    outline: 0;
    color: #f0f6ff;
    selection-background-color: #255b96;
}
QComboBox#sheetModeComboBox {
    min-height: 30px;
    padding: 4px 8px;
}
QTableWidget#rulesTable {
    background: rgba(9, 15, 25, 0.76);
    alternate-background-color: rgba(18, 31, 49, 0.78);
    color: #edf4ff;
    border: 1px solid #30455f;
    border-radius: 8px;
    gridline-color: #263a54;
    selection-background-color: #285f92;
    selection-color: #ffffff;
}
QTableWidget#rulesTable::item {
    padding: 8px 10px;
    border: 0;
}
QTableWidget#rulesTable::item:selected {
    background: #285f92;
    color: #ffffff;
}
QHeaderView {
    background: #18263a;
}
QHeaderView::section {
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
        stop:0 #20344f, stop:1 #18263a);
    color: #ffffff;
    padding: 10px 10px;
    border: 0;
    border-right: 1px solid #30455f;
    border-bottom: 1px solid #30455f;
    font-weight: 800;
}
QTableCornerButton::section {
    background: #18263a;
    border: 0;
    border-right: 1px solid #30455f;
    border-bottom: 1px solid #30455f;
}
QPlainTextEdit#logConsole {
    min-height: 126px;
    background: rgba(7, 11, 18, 0.82);
    border-color: #30455f;
    color: #dce8f7;
    font-family: "Cascadia Mono", "Consolas", monospace;
    font-size: 10pt;
}
QProgressBar {
    border: 1px solid #30455f;
    border-radius: 8px;
    background: rgba(8, 13, 21, 0.82);
    color: #edf4ff;
    text-align: center;
    height: 16px;
}
QProgressBar::chunk {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #4fd5b7, stop:0.48 #45c4e8, stop:1 #4e8ff5);
    border-radius: 7px;
}
QScrollBar:vertical,
QScrollBar:horizontal {
    background: transparent;
    border: 0;
    margin: 0;
}
QScrollBar::handle:vertical,
QScrollBar::handle:horizontal {
    background: #31445d;
    border-radius: 5px;
    min-height: 28px;
    min-width: 28px;
}
QScrollBar::handle:vertical:hover,
QScrollBar::handle:horizontal:hover {
    background: #5e88c4;
}
QScrollBar::add-line,
QScrollBar::sub-line {
    width: 0;
    height: 0;
}
QStatusBar {
    background: transparent;
    color: #b6c6dc;
    border-top: 1px solid #253954;
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
