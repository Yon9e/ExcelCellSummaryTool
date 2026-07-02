"""帮助说明弹窗。"""

from __future__ import annotations

from PySide6.QtWidgets import QDialog

from app.ui.generated.ui_help_dialog import Ui_HelpDialog


HELP_HTML = """
<h2>Excel 单元格定向汇总工具</h2>
<p>本工具批量读取目标文件夹中的 Excel 文件，并按规则读取指定 Sheet 与单元格。</p>
<h3>Sheet 模式</h3>
<ul>
  <li><b>exact</b>：Sheet 名精确匹配。</li>
  <li><b>contains</b>：Sheet 名包含关键词，命中第一个 Sheet。</li>
  <li><b>index</b>：按 Sheet 顺序定位，1 表示第一个 Sheet。</li>
</ul>
<h3>单元格地址</h3>
<p>请输入标准 Excel 地址，例如 B7、C10、AA20。</p>
<h3>文件筛选</h3>
<p>当前版本执行非递归扫描，处理 .xlsx / .xlsm / .xltx / .xltm，并自动跳过 ~$ 临时文件。</p>
<h3>输出覆盖</h3>
<p>输出文件已存在时会询问是否覆盖；如果文件被 Excel 打开，请关闭后重试。</p>
<h3>公式读取</h3>
<p>公式单元格读取的是工作簿已保存的缓存值，本工具不负责重新计算 Excel 公式。</p>
"""


class HelpDialog(QDialog):
    """帮助说明窗口。"""

    def __init__(self, parent: object | None = None) -> None:
        super().__init__(parent)
        self.ui = Ui_HelpDialog()
        self.ui.setupUi(self)
        self.ui.helpTextBrowser.setHtml(HELP_HTML)
        self.ui.closeButton.clicked.connect(self.accept)
