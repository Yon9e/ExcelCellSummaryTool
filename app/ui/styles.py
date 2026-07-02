"""应用 QSS 样式。"""

from __future__ import annotations

from typing import Any


PREFERRED_UI_FONTS = (
    "Noto Sans SC",
    "HarmonyOS Sans SC",
    "MiSans",
    "Inter",
    "Segoe UI",
    "Microsoft YaHei UI",
)


APP_STYLE = """
* {
    font-family: "Noto Sans SC", "HarmonyOS Sans SC", "MiSans", "Inter", "Segoe UI", "Microsoft YaHei UI", sans-serif;
}
QMainWindow {
    background: #0a1320;
    color: #edf4ff;
    font-size: 11pt;
}
QWidget#centralwidget {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #152743, stop:0.45 #0f1f33, stop:1 #092733);
}
QFrame#sidebarFrame {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #152b4c, stop:0.55 #142640, stop:1 #0f2034);
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
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #12253c, stop:0.52 #0e2034, stop:1 #0b1c2d);
    border: 1px solid #284462;
    border-radius: 8px;
}
QFrame#contentFrame {
    background: transparent;
}
QStackedWidget#contentStack {
    background: transparent;
    border: 0;
}
QWidget#schemePage,
QWidget#sourcePage,
QWidget#rulesPage,
QWidget#runPage {
    background: transparent;
}
QLabel#sidebarTitleLabel {
    color: #ffffff;
    font-size: 16pt;
    font-weight: 700;
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
    font-weight: 700;
}
QLabel#schemeSectionTitleLabel,
QLabel#sourceSectionTitleLabel,
QLabel#rulesSectionTitleLabel,
QLabel#logSectionTitleLabel {
    color: #ffffff;
    font-size: 15pt;
    font-weight: 700;
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
    font-weight: 600;
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
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #1e426c, stop:1 #183657);
    color: #dbeeff;
    border-color: #37679b;
    font-weight: 700;
}
QPushButton#startButton {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #4fd5b7, stop:0.52 #45c4e8, stop:1 #4e8ff5);
    color: #031312;
    border-color: #70d8ec;
    font-weight: 700;
}
QPushButton#navSchemeButton[active="true"],
QPushButton#navSourceButton[active="true"],
QPushButton#navRulesButton[active="true"],
QPushButton#navRunButton[active="true"] {
    border-left: 3px solid #65b9ff;
    padding-left: 17px;
}
QPushButton#navSchemeButton[active="true"]:hover,
QPushButton#navSourceButton[active="true"]:hover,
QPushButton#navRulesButton[active="true"]:hover,
QPushButton#navRunButton[active="true"]:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #24517f, stop:1 #1b4269);
    border-color: #4f87c4;
}
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
    font-weight: 700;
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


def _preferred_ui_font() -> str:
    """选择最接近现代产品界面的可用字体。"""
    from PySide6.QtGui import QFontDatabase

    available_fonts = set(QFontDatabase.families())
    for font_name in PREFERRED_UI_FONTS:
        if font_name in available_fonts:
            return font_name
    return "Microsoft YaHei UI"


def apply_desktop_theme(app: Any) -> None:
    """应用 qt-material 深色主题，并叠加本项目样式。"""
    from PySide6.QtGui import QFont

    ui_font = _preferred_ui_font()
    app.setFont(QFont(ui_font, 10))
    try:
        from qt_material import apply_stylesheet

        apply_stylesheet(app, theme="dark_cyan.xml", style="Fusion")
    except Exception:
        app.setStyle("Fusion")
    app.setFont(QFont(ui_font, 10))
    app.setStyleSheet(f"{app.styleSheet()}\n{APP_STYLE}")
