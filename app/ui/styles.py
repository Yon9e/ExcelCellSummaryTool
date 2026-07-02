"""应用 QSS 样式。"""


APP_STYLE = """
QMainWindow {
    background: #f6f7f9;
    color: #202631;
    font-family: "Microsoft YaHei UI", "Segoe UI", sans-serif;
    font-size: 10.5pt;
}
QFrame#headerFrame {
    background: #ffffff;
    border: 1px solid #dde2ea;
    border-radius: 8px;
}
QLabel#titleLabel {
    color: #172033;
    font-size: 18pt;
    font-weight: 700;
}
QLabel#subtitleLabel,
QLabel#currentFileLabel,
QLabel#countLabel {
    color: #5d6676;
}
QGroupBox {
    background: #ffffff;
    border: 1px solid #dde2ea;
    border-radius: 8px;
    margin-top: 18px;
    padding: 14px 12px 12px 12px;
    font-weight: 600;
    color: #253044;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 12px;
    padding: 0 4px;
}
QLineEdit,
QComboBox,
QTableWidget,
QPlainTextEdit,
QTextBrowser {
    background: #fbfcfd;
    border: 1px solid #cfd6e2;
    border-radius: 6px;
    padding: 6px;
    color: #1f2937;
    selection-background-color: #cae7d5;
}
QLineEdit:focus,
QComboBox:focus,
QTableWidget:focus,
QPlainTextEdit:focus {
    border: 1px solid #2f855a;
    background: #ffffff;
}
QPushButton {
    background: #ffffff;
    border: 1px solid #cfd6e2;
    border-radius: 6px;
    padding: 7px 12px;
    color: #1f2937;
    font-weight: 500;
}
QPushButton:hover {
    background: #f0f3f7;
}
QPushButton:disabled {
    color: #9aa3b2;
    background: #eef1f5;
}
QPushButton#primaryButton,
QPushButton#startButton {
    background: #23734d;
    border-color: #23734d;
    color: #ffffff;
    font-weight: 700;
}
QPushButton#primaryButton:hover,
QPushButton#startButton:hover {
    background: #1f6845;
}
QPushButton#dangerButton,
QPushButton#deleteSchemeButton,
QPushButton#deleteRuleButton {
    color: #9f1d1d;
    border-color: #e2b7b7;
}
QPushButton#dangerButton:hover,
QPushButton#deleteSchemeButton:hover,
QPushButton#deleteRuleButton:hover {
    background: #fff1f1;
}
QTableWidget#rulesTable {
    gridline-color: #e1e6ee;
    alternate-background-color: #f5f7fa;
}
QHeaderView::section {
    background: #e8eef7;
    color: #273244;
    padding: 7px;
    border: 0;
    border-right: 1px solid #d2dae6;
    font-weight: 700;
}
QPlainTextEdit#logConsole {
    background: #111827;
    border-color: #111827;
    color: #d1d5db;
    font-family: "Cascadia Mono", "Consolas", monospace;
    font-size: 9.5pt;
}
QProgressBar {
    border: 1px solid #cfd6e2;
    border-radius: 6px;
    background: #eef1f5;
    text-align: center;
    height: 18px;
}
QProgressBar::chunk {
    background: #2f855a;
    border-radius: 5px;
}
QStatusBar {
    background: #ffffff;
    color: #5d6676;
}
"""
