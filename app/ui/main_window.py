"""主窗口。"""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QSize, QThread, Qt
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (
    QAbstractItemView,
    QComboBox,
    QFileDialog,
    QFrame,
    QGraphicsDropShadowEffect,
    QHeaderView,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QStyle,
    QTableWidgetItem,
)

from app.models.rule import Rule, validate_rules
from app.models.scheme import Scheme
from app.services.log_service import format_ui_log, write_debug_log
from app.services.scheme_service import SchemeService
from app.ui.dialogs import HelpDialog
from app.ui.generated.ui_main_window import Ui_MainWindow
from app.ui.styles import APP_STYLE
from app.workers.summary_worker import SummaryWorker


SHEET_MODE_LABELS = {
    "exact": "exact - 精确匹配",
    "contains": "contains - 包含关键词",
    "index": "index - 按序号",
}

FILTER_MODE_LABELS = {
    "include": "包含关键词",
    "exclude": "排除关键词",
}

NAV_PAGE_LABELS = ["方案管理", "数据源配置", "规则配置", "执行与日志"]


class MainWindow(QMainWindow):
    """Excel 定向汇总主窗口。"""

    def __init__(self) -> None:
        super().__init__()
        self.ui = Ui_MainWindow()
        self.ui.setupUi(self)
        self.setStyleSheet(APP_STYLE)
        self.scheme_service = SchemeService()
        self.worker_thread: QThread | None = None
        self.worker: SummaryWorker | None = None
        self._configure_widgets()
        self._apply_visual_effects()
        self._connect_signals()
        self._reload_scheme_names()
        self._append_log("INFO", "应用已启动。")

    def closeEvent(self, event: object) -> None:
        """任务运行时退出前二次确认。"""
        if self.worker_thread is not None and self.worker_thread.isRunning():
            reply = QMessageBox.question(
                self,
                "确认退出",
                "汇总任务正在运行，确认要退出吗？",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                QMessageBox.StandardButton.No,
            )
            if reply != QMessageBox.StandardButton.Yes:
                event.ignore()
                return
            self.worker_thread.quit()
            self.worker_thread.wait(3000)
        event.accept()

    def _configure_widgets(self) -> None:
        self.setMinimumSize(1100, 720)
        self.resize(1280, 820)
        self.ui.filterModeComboBox.clear()
        for value, label in FILTER_MODE_LABELS.items():
            self.ui.filterModeComboBox.addItem(label, value)
        self.ui.rulesTable.setColumnCount(4)
        self.ui.rulesTable.setHorizontalHeaderLabels(["输出列名", "Sheet 模式", "Sheet 值", "单元格"])
        self.ui.rulesTable.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.ui.rulesTable.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.ui.rulesTable.setAlternatingRowColors(True)
        self.ui.rulesTable.setShowGrid(True)
        self.ui.rulesTable.verticalHeader().setDefaultSectionSize(46)
        self.ui.rulesTable.verticalHeader().setVisible(False)
        header = self.ui.rulesTable.horizontalHeader()
        header.setStretchLastSection(True)
        header.setHighlightSections(False)
        header.setDefaultAlignment(Qt.AlignmentFlag.AlignCenter)
        header.setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.ui.progressBar.setValue(0)
        self.ui.countLabel.setText("已处理 0 / 0")
        self.ui.currentFileLabel.setText("当前处理文件：-")
        self.ui.sidebarHintLabel.setMinimumHeight(82)
        self.ui.sidebarHintLabel.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        for button in self._navigation_buttons():
            button.setCursor(Qt.CursorShape.PointingHandCursor)
        self._apply_button_icons()
        self._switch_page(2)

    def _apply_visual_effects(self) -> None:
        # 视觉处理：给主卡片增加轻量阴影，不影响业务功能。
        for frame in [
            self.ui.sidebarFrame,
            self.ui.headerFrame,
            self.ui.schemeGroupBox,
            self.ui.sourceGroupBox,
            self.ui.rulesGroupBox,
            self.ui.logGroupBox,
        ]:
            self._set_card_shadow(frame)

    def _set_card_shadow(self, frame: QFrame) -> None:
        shadow = QGraphicsDropShadowEffect(frame)
        shadow.setBlurRadius(16)
        shadow.setOffset(0, 4)
        shadow.setColor(QColor(0, 0, 0, 80))
        frame.setGraphicsEffect(shadow)

    def _apply_button_icons(self) -> None:
        icon_size = QSize(18, 18)
        icon_map = {
            self.ui.helpButton: QStyle.StandardPixmap.SP_MessageBoxInformation,
            self.ui.browseTargetButton: QStyle.StandardPixmap.SP_DirOpenIcon,
            self.ui.browseOutputButton: QStyle.StandardPixmap.SP_FileIcon,
            self.ui.saveSchemeButton: QStyle.StandardPixmap.SP_DialogSaveButton,
            self.ui.loadSchemeButton: QStyle.StandardPixmap.SP_DialogOpenButton,
            self.ui.deleteSchemeButton: QStyle.StandardPixmap.SP_TrashIcon,
            self.ui.addRuleButton: QStyle.StandardPixmap.SP_FileDialogNewFolder,
            self.ui.deleteRuleButton: QStyle.StandardPixmap.SP_TrashIcon,
            self.ui.sampleRuleButton: QStyle.StandardPixmap.SP_DialogApplyButton,
            self.ui.startButton: QStyle.StandardPixmap.SP_MediaPlay,
            self.ui.clearLogButton: QStyle.StandardPixmap.SP_DialogResetButton,
        }
        for button, icon_name in icon_map.items():
            button.setIcon(self.style().standardIcon(icon_name))
            button.setIconSize(icon_size)
            button.setCursor(Qt.CursorShape.PointingHandCursor)

    def _connect_signals(self) -> None:
        self.ui.helpButton.clicked.connect(self._show_help)
        for page_index, button in enumerate(self._navigation_buttons()):
            button.clicked.connect(lambda _checked=False, index=page_index: self._switch_page(index))
        self.ui.browseTargetButton.clicked.connect(self._browse_target_folder)
        self.ui.browseOutputButton.clicked.connect(self._browse_output_file)
        self.ui.saveSchemeButton.clicked.connect(self._save_scheme)
        self.ui.loadSchemeButton.clicked.connect(self._load_selected_scheme)
        self.ui.deleteSchemeButton.clicked.connect(self._delete_selected_scheme)
        self.ui.addRuleButton.clicked.connect(lambda: self._add_rule_row())
        self.ui.deleteRuleButton.clicked.connect(self._delete_selected_rule)
        self.ui.sampleRuleButton.clicked.connect(self._fill_sample_rules)
        self.ui.clearLogButton.clicked.connect(self.ui.logConsole.clear)
        self.ui.startButton.clicked.connect(self._start_summary)

    def _navigation_buttons(self) -> list[QPushButton]:
        return [
            self.ui.navSchemeButton,
            self.ui.navSourceButton,
            self.ui.navRulesButton,
            self.ui.navRunButton,
        ]

    def _switch_page(self, index: int) -> None:
        index = max(0, min(index, self.ui.contentStack.count() - 1))
        self.ui.contentStack.setCurrentIndex(index)
        for page_index, button in enumerate(self._navigation_buttons()):
            is_active = page_index == index
            button.setProperty("active", is_active)
            button.style().unpolish(button)
            button.style().polish(button)
            button.update()
        self.statusBar().showMessage(f"当前页面：{NAV_PAGE_LABELS[index]}", 3000)

    def _show_help(self) -> None:
        dialog = HelpDialog(self)
        dialog.exec()

    def _browse_target_folder(self) -> None:
        folder = QFileDialog.getExistingDirectory(self, "选择目标文件夹", self.ui.targetFolderEdit.text())
        if folder:
            self.ui.targetFolderEdit.setText(folder)

    def _browse_output_file(self) -> None:
        file_name, _ = QFileDialog.getSaveFileName(
            self,
            "选择输出 Excel 文件",
            self.ui.outputFileEdit.text() or "汇总结果.xlsx",
            "Excel 工作簿 (*.xlsx)",
        )
        if file_name:
            if not file_name.lower().endswith(".xlsx"):
                file_name = f"{file_name}.xlsx"
            self.ui.outputFileEdit.setText(file_name)

    def _save_scheme(self) -> None:
        try:
            scheme = self._collect_scheme()
            self.scheme_service.save(scheme)
            self._reload_scheme_names(scheme.name)
            self._append_log("DONE", f"方案已保存：{scheme.name}")
        except Exception as exc:
            write_debug_log("保存方案失败。", exc)
            self._show_error("保存方案失败", str(exc))

    def _load_selected_scheme(self) -> None:
        name = self.ui.schemeComboBox.currentText().strip()
        if not name:
            self._show_error("载入方案失败", "请先选择已保存方案。")
            return
        scheme = self.scheme_service.get(name)
        if scheme is None:
            self._show_error("载入方案失败", "未找到该方案。")
            self._reload_scheme_names()
            return
        self._apply_scheme(scheme)
        self._append_log("INFO", f"方案已载入：{name}")

    def _delete_selected_scheme(self) -> None:
        name = self.ui.schemeComboBox.currentText().strip()
        if not name:
            self._show_error("删除方案失败", "请先选择已保存方案。")
            return
        reply = QMessageBox.question(
            self,
            "确认删除",
            f"确认删除方案“{name}”吗？",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )
        if reply != QMessageBox.StandardButton.Yes:
            return
        if self.scheme_service.delete(name):
            self._reload_scheme_names()
            self._append_log("DONE", f"方案已删除：{name}")

    def _reload_scheme_names(self, selected: str | None = None) -> None:
        self.ui.schemeComboBox.blockSignals(True)
        self.ui.schemeComboBox.clear()
        self.ui.schemeComboBox.addItems(self.scheme_service.names())
        if selected:
            index = self.ui.schemeComboBox.findText(selected)
            if index >= 0:
                self.ui.schemeComboBox.setCurrentIndex(index)
        self.ui.schemeComboBox.blockSignals(False)

    def _collect_scheme(self) -> Scheme:
        name = self.ui.schemeNameEdit.text().strip()
        return Scheme(
            name=name,
            target_folder=self.ui.targetFolderEdit.text().strip(),
            output_file=self.ui.outputFileEdit.text().strip(),
            keyword=self.ui.keywordEdit.text().strip(),
            filter_mode=self.ui.filterModeComboBox.currentData(),
            rules=self._collect_rules(),
        )

    def _apply_scheme(self, scheme: Scheme) -> None:
        self.ui.schemeNameEdit.setText(scheme.name)
        self.ui.targetFolderEdit.setText(scheme.target_folder)
        self.ui.outputFileEdit.setText(scheme.output_file)
        self.ui.keywordEdit.setText(scheme.keyword)
        filter_index = self.ui.filterModeComboBox.findData(scheme.filter_mode)
        if filter_index >= 0:
            self.ui.filterModeComboBox.setCurrentIndex(filter_index)
        self.ui.rulesTable.setRowCount(0)
        for rule in scheme.rules:
            self._add_rule_row(rule)

    def _add_rule_row(self, rule: Rule | None = None) -> None:
        row = self.ui.rulesTable.rowCount()
        self.ui.rulesTable.insertRow(row)
        rule = rule or Rule("", "exact", "", "")
        self.ui.rulesTable.setItem(row, 0, QTableWidgetItem(rule.output_column))
        mode_combo = QComboBox()
        mode_combo.setObjectName("sheetModeComboBox")
        for value, label in SHEET_MODE_LABELS.items():
            mode_combo.addItem(label, value)
        mode_index = mode_combo.findData(rule.sheet_mode)
        mode_combo.setCurrentIndex(max(mode_index, 0))
        self.ui.rulesTable.setCellWidget(row, 1, mode_combo)
        self.ui.rulesTable.setItem(row, 2, QTableWidgetItem(rule.sheet_value))
        self.ui.rulesTable.setItem(row, 3, QTableWidgetItem(rule.cell))

    def _delete_selected_rule(self) -> None:
        row = self.ui.rulesTable.currentRow()
        if row < 0:
            self._show_error("删除规则失败", "请先选择要删除的规则。")
            return
        self.ui.rulesTable.removeRow(row)

    def _fill_sample_rules(self) -> None:
        self.ui.rulesTable.setRowCount(0)
        examples = [
            Rule("货币资金", "exact", "资产负债表", "B7"),
            Rule("营业收入", "contains", "利润", "C12"),
            Rule("第一个 Sheet 样例", "index", "1", "A1"),
        ]
        for rule in examples:
            self._add_rule_row(rule)
        self._append_log("INFO", "已填充示例规则。")

    def _collect_rules(self) -> list[Rule]:
        rules: list[Rule] = []
        for row in range(self.ui.rulesTable.rowCount()):
            output_item = self.ui.rulesTable.item(row, 0)
            sheet_value_item = self.ui.rulesTable.item(row, 2)
            cell_item = self.ui.rulesTable.item(row, 3)
            mode_combo = self.ui.rulesTable.cellWidget(row, 1)
            sheet_mode = mode_combo.currentData() if isinstance(mode_combo, QComboBox) else "exact"
            rules.append(
                Rule(
                    output_column=output_item.text() if output_item else "",
                    sheet_mode=str(sheet_mode),
                    sheet_value=sheet_value_item.text() if sheet_value_item else "",
                    cell=cell_item.text() if cell_item else "",
                )
            )
        return validate_rules(rules)

    def _start_summary(self) -> None:
        try:
            target_folder = self.ui.targetFolderEdit.text().strip()
            output_file = self.ui.outputFileEdit.text().strip()
            if not target_folder:
                raise ValueError("请选择目标文件夹。")
            if not output_file:
                raise ValueError("请选择输出 Excel 文件。")
            output_path = Path(output_file)
            if output_path.exists():
                reply = QMessageBox.question(
                    self,
                    "确认覆盖",
                    f"输出文件已存在，是否覆盖？\n{output_path}",
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                    QMessageBox.StandardButton.No,
                )
                if reply != QMessageBox.StandardButton.Yes:
                    return
            rules = self._collect_rules()
        except Exception as exc:
            self._show_error("参数校验失败", str(exc))
            return

        self._set_running_state(True)
        self.ui.progressBar.setValue(0)
        self.ui.countLabel.setText("已处理 0 / 0")
        self.ui.currentFileLabel.setText("当前处理文件：-")
        self._append_log("INFO", "开始汇总。")

        self.worker_thread = QThread(self)
        self.worker = SummaryWorker(
            target_folder=target_folder,
            output_file=output_file,
            keyword=self.ui.keywordEdit.text().strip(),
            filter_mode=self.ui.filterModeComboBox.currentData(),
            rules=rules,
        )
        self.worker.moveToThread(self.worker_thread)
        self.worker_thread.started.connect(self.worker.run)
        self.worker.log_signal.connect(self._handle_worker_log)
        self.worker.progress_signal.connect(self._handle_progress)
        self.worker.current_file_signal.connect(self._handle_current_file)
        self.worker.error_signal.connect(lambda message: self._append_log("ERROR", message))
        self.worker.finished_signal.connect(self._handle_finished)
        self.worker.finished_signal.connect(self.worker_thread.quit)
        self.worker.finished_signal.connect(self.worker.deleteLater)
        self.worker_thread.finished.connect(self.worker_thread.deleteLater)
        self.worker_thread.start()

    def _handle_worker_log(self, payload: str) -> None:
        level, _, message = payload.partition("|")
        self._append_log(level or "INFO", message)

    def _handle_progress(self, processed: int, total: int) -> None:
        self.ui.countLabel.setText(f"已处理 {processed} / {total}")
        self.ui.progressBar.setMaximum(max(total, 1))
        self.ui.progressBar.setValue(processed)

    def _handle_current_file(self, file_path: str) -> None:
        self.ui.currentFileLabel.setText(f"当前处理文件：{Path(file_path).name}")

    def _handle_finished(self, success: bool, message: str) -> None:
        self._set_running_state(False)
        self.worker_thread = None
        self.worker = None
        if success:
            self.statusBar().showMessage("汇总完成", 8000)
            QMessageBox.information(self, "汇总完成", f"输出文件：\n{message}")
        else:
            self.statusBar().showMessage("汇总失败", 8000)
            self._show_error("汇总失败", message)

    def _set_running_state(self, running: bool) -> None:
        for button in [
            self.ui.startButton,
            self.ui.saveSchemeButton,
            self.ui.loadSchemeButton,
            self.ui.deleteSchemeButton,
            self.ui.addRuleButton,
            self.ui.deleteRuleButton,
            self.ui.sampleRuleButton,
        ]:
            button.setDisabled(running)
        self.statusBar().showMessage("正在汇总..." if running else "就绪")

    def _append_log(self, level: str, message: str) -> None:
        self.ui.logConsole.appendPlainText(format_ui_log(level, message))
        scrollbar = self.ui.logConsole.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())

    def _show_error(self, title: str, message: str) -> None:
        QMessageBox.warning(self, title, message)
        self._append_log("ERROR", message)
