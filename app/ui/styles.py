"""应用 QSS 样式。"""

from __future__ import annotations

from typing import Any


APP_STYLE = """
* {
    font-family: "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", sans-serif;
}
QMainWindow {
    background: #07090d;
    color: #e7edf8;
    font-size: 10.5pt;
}
QWidget#centralwidget {
    background: #07090d;
}
QFrame#sidebarFrame,
QFrame#headerFrame {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #15241f, stop:0.48 #121b28, stop:1 #0d111a);
    border: 1px solid #2d3a4b;
    border-radius: 8px;
}
QFrame#schemeGroupBox,
QFrame#sourceGroupBox,
QFrame#rulesGroupBox,
QFrame#logGroupBox {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #121a26, stop:0.62 #0f1621, stop:1 #0b1018);
    border: 1px solid #273548;
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
    font-size: 15.5pt;
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
    background: #0c131d;
    border: 1px solid #253444;
    border-radius: 8px;
    padding: 8px 10px;
    line-height: 150%;
}
QLabel#titleLabel {
    color: #f8fbff;
    font-size: 20.5pt;
    font-weight: 800;
}
QLabel#schemeSectionTitleLabel,
QLabel#sourceSectionTitleLabel,
QLabel#rulesSectionTitleLabel,
QLabel#logSectionTitleLabel {
    color: #f8fbff;
    font-size: 13.5pt;
    font-weight: 800;
}
QLabel {
    color: #dbe6f7;
}
QPushButton {
    min-height: 36px;
    background: #172131;
    border: 1px solid #2b3a4f;
    border-radius: 8px;
    padding: 8px 14px;
    color: #e6edf8;
    font-weight: 600;
}
QPushButton:hover {
    background: #1d2b3f;
    border-color: #5ed7c7;
}
QPushButton:pressed {
    background: #101823;
}
QPushButton:disabled {
    color: #64738d;
    background: #111822;
    border-color: #222e3f;
}
QPushButton#navSourceButton,
QPushButton#navRulesButton,
QPushButton#navSchemeButton,
QPushButton#navRunButton {
    text-align: left;
    padding-left: 20px;
    background: #111a26;
    border-color: #253449;
}
QPushButton#navSchemeButton[active="true"],
QPushButton#navSourceButton[active="true"],
QPushButton#navRulesButton[active="true"],
QPushButton#navRunButton[active="true"],
QPushButton#startButton {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #4fd5b7, stop:0.48 #55d0e5, stop:1 #6ba7f5);
    color: #031312;
    border-color: #79e5d5;
    font-weight: 800;
}
QPushButton#navSchemeButton[active="true"],
QPushButton#navSourceButton[active="true"],
QPushButton#navRulesButton[active="true"],
QPushButton#navRunButton[active="true"] {
    border-left: 4px solid #b9f4d8;
    padding-left: 16px;
}
QPushButton#navSchemeButton[active="true"]:hover,
QPushButton#navSourceButton[active="true"]:hover,
QPushButton#navRulesButton[active="true"]:hover,
QPushButton#navRunButton[active="true"]:hover,
QPushButton#startButton:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #6ee7c8, stop:0.55 #72dff0, stop:1 #8fbcff);
}
QPushButton#startButton {
    min-height: 42px;
}
QPushButton#deleteSchemeButton,
QPushButton#deleteRuleButton {
    color: #ffd7dd;
    border-color: #7a3545;
    background: #241722;
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
    background: #0b111b;
    border: 1px solid #2b3d55;
    border-radius: 8px;
    padding: 7px 10px;
    color: #e7edf8;
    selection-background-color: #4dd0e1;
    selection-color: #06111f;
}
QLineEdit::placeholder {
    color: #79879c;
}
QLineEdit:focus,
QComboBox:focus,
QPlainTextEdit:focus,
QTextBrowser:focus {
    border-color: #5ed7c7;
    background: #101927;
}
QComboBox::drop-down {
    width: 28px;
    border: 0;
    border-left: 1px solid #2b3d5e;
}
QComboBox QAbstractItemView {
    background: #101927;
    border: 1px solid #2b3d55;
    outline: 0;
    color: #e7edf8;
    selection-background-color: #237a72;
}
QComboBox#sheetModeComboBox {
    min-height: 30px;
    padding: 4px 8px;
}
QTableWidget#rulesTable {
    background: #0b111b;
    alternate-background-color: #101927;
    color: #dce7f6;
    border: 1px solid #28384d;
    border-radius: 8px;
    gridline-color: #213044;
    selection-background-color: #276a76;
    selection-color: #ffffff;
}
QTableWidget#rulesTable::item {
    padding: 8px 10px;
    border: 0;
}
QTableWidget#rulesTable::item:selected {
    background: #234e77;
    color: #ffffff;
}
QHeaderView {
    background: #172132;
}
QHeaderView::section {
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
        stop:0 #1b2a3f, stop:1 #151f2e);
    color: #f1f6ff;
    padding: 10px 10px;
    border: 0;
    border-right: 1px solid #28384d;
    border-bottom: 1px solid #28384d;
    font-weight: 800;
}
QTableCornerButton::section {
    background: #151f2e;
    border: 0;
    border-right: 1px solid #28384d;
    border-bottom: 1px solid #28384d;
}
QPlainTextEdit#logConsole {
    min-height: 126px;
    background: #070b12;
    border-color: #25364a;
    color: #d1deef;
    font-family: "Cascadia Mono", "Consolas", monospace;
    font-size: 9.6pt;
}
QProgressBar {
    border: 1px solid #28384d;
    border-radius: 8px;
    background: #080d15;
    color: #dbe6f7;
    text-align: center;
    height: 16px;
}
QProgressBar::chunk {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #4fd5b7, stop:0.48 #55d0e5, stop:1 #6ba7f5);
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
    background: #2a3a4f;
    border-radius: 5px;
    min-height: 28px;
    min-width: 28px;
}
QScrollBar::handle:vertical:hover,
QScrollBar::handle:horizontal:hover {
    background: #5ed7c7;
}
QScrollBar::add-line,
QScrollBar::sub-line {
    width: 0;
    height: 0;
}
QStatusBar {
    background: #07090d;
    color: #9aa8c1;
    border-top: 1px solid #202b3a;
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
