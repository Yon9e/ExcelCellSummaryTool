# -*- coding: utf-8 -*-

################################################################################
## Form generated from reading UI file 'main_window.ui'
##
## Created by: Qt User Interface Compiler version 6.11.0
##
## WARNING! All changes made in this file will be lost when recompiling UI file!
################################################################################

from PySide6.QtCore import (QCoreApplication, QDate, QDateTime, QLocale,
    QMetaObject, QObject, QPoint, QRect,
    QSize, QTime, QUrl, Qt)
from PySide6.QtGui import (QBrush, QColor, QConicalGradient, QCursor,
    QFont, QFontDatabase, QGradient, QIcon,
    QImage, QKeySequence, QLinearGradient, QPainter,
    QPalette, QPixmap, QRadialGradient, QTransform)
from PySide6.QtWidgets import (QAbstractItemView, QApplication, QComboBox, QFrame,
    QGridLayout, QGroupBox, QHBoxLayout, QHeaderView,
    QLabel, QLineEdit, QMainWindow, QPlainTextEdit,
    QProgressBar, QPushButton, QSizePolicy, QSpacerItem,
    QSplitter, QStatusBar, QTableWidget, QTableWidgetItem,
    QVBoxLayout, QWidget)

class Ui_MainWindow(object):
    def setupUi(self, MainWindow):
        if not MainWindow.objectName():
            MainWindow.setObjectName(u"MainWindow")
        MainWindow.resize(1280, 820)
        MainWindow.setMinimumSize(QSize(1100, 720))
        self.centralwidget = QWidget(MainWindow)
        self.centralwidget.setObjectName(u"centralwidget")
        self.mainLayout = QVBoxLayout(self.centralwidget)
        self.mainLayout.setSpacing(12)
        self.mainLayout.setObjectName(u"mainLayout")
        self.mainLayout.setContentsMargins(14, 14, 14, 14)
        self.headerFrame = QFrame(self.centralwidget)
        self.headerFrame.setObjectName(u"headerFrame")
        self.headerFrame.setFrameShape(QFrame.Shape.StyledPanel)
        self.headerLayout = QHBoxLayout(self.headerFrame)
        self.headerLayout.setObjectName(u"headerLayout")
        self.headerLayout.setContentsMargins(16, 12, 16, 12)
        self.titleLayout = QVBoxLayout()
        self.titleLayout.setObjectName(u"titleLayout")
        self.titleLabel = QLabel(self.headerFrame)
        self.titleLabel.setObjectName(u"titleLabel")

        self.titleLayout.addWidget(self.titleLabel)

        self.subtitleLabel = QLabel(self.headerFrame)
        self.subtitleLabel.setObjectName(u"subtitleLabel")

        self.titleLayout.addWidget(self.subtitleLabel)


        self.headerLayout.addLayout(self.titleLayout)

        self.headerSpacer = QSpacerItem(40, 20, QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)

        self.headerLayout.addItem(self.headerSpacer)

        self.helpButton = QPushButton(self.headerFrame)
        self.helpButton.setObjectName(u"helpButton")

        self.headerLayout.addWidget(self.helpButton)


        self.mainLayout.addWidget(self.headerFrame)

        self.schemeGroupBox = QGroupBox(self.centralwidget)
        self.schemeGroupBox.setObjectName(u"schemeGroupBox")
        self.schemeLayout = QHBoxLayout(self.schemeGroupBox)
        self.schemeLayout.setObjectName(u"schemeLayout")
        self.schemeNameEdit = QLineEdit(self.schemeGroupBox)
        self.schemeNameEdit.setObjectName(u"schemeNameEdit")

        self.schemeLayout.addWidget(self.schemeNameEdit)

        self.schemeComboBox = QComboBox(self.schemeGroupBox)
        self.schemeComboBox.setObjectName(u"schemeComboBox")
        self.schemeComboBox.setMinimumWidth(220)

        self.schemeLayout.addWidget(self.schemeComboBox)

        self.saveSchemeButton = QPushButton(self.schemeGroupBox)
        self.saveSchemeButton.setObjectName(u"saveSchemeButton")

        self.schemeLayout.addWidget(self.saveSchemeButton)

        self.loadSchemeButton = QPushButton(self.schemeGroupBox)
        self.loadSchemeButton.setObjectName(u"loadSchemeButton")

        self.schemeLayout.addWidget(self.loadSchemeButton)

        self.deleteSchemeButton = QPushButton(self.schemeGroupBox)
        self.deleteSchemeButton.setObjectName(u"deleteSchemeButton")

        self.schemeLayout.addWidget(self.deleteSchemeButton)


        self.mainLayout.addWidget(self.schemeGroupBox)

        self.sourceGroupBox = QGroupBox(self.centralwidget)
        self.sourceGroupBox.setObjectName(u"sourceGroupBox")
        self.sourceLayout = QGridLayout(self.sourceGroupBox)
        self.sourceLayout.setObjectName(u"sourceLayout")
        self.sourceLayout.setHorizontalSpacing(10)
        self.sourceLayout.setVerticalSpacing(10)
        self.targetFolderLabel = QLabel(self.sourceGroupBox)
        self.targetFolderLabel.setObjectName(u"targetFolderLabel")

        self.sourceLayout.addWidget(self.targetFolderLabel, 0, 0, 1, 1)

        self.targetFolderEdit = QLineEdit(self.sourceGroupBox)
        self.targetFolderEdit.setObjectName(u"targetFolderEdit")

        self.sourceLayout.addWidget(self.targetFolderEdit, 0, 1, 1, 1)

        self.browseTargetButton = QPushButton(self.sourceGroupBox)
        self.browseTargetButton.setObjectName(u"browseTargetButton")

        self.sourceLayout.addWidget(self.browseTargetButton, 0, 2, 1, 1)

        self.outputFileLabel = QLabel(self.sourceGroupBox)
        self.outputFileLabel.setObjectName(u"outputFileLabel")

        self.sourceLayout.addWidget(self.outputFileLabel, 1, 0, 1, 1)

        self.outputFileEdit = QLineEdit(self.sourceGroupBox)
        self.outputFileEdit.setObjectName(u"outputFileEdit")

        self.sourceLayout.addWidget(self.outputFileEdit, 1, 1, 1, 1)

        self.browseOutputButton = QPushButton(self.sourceGroupBox)
        self.browseOutputButton.setObjectName(u"browseOutputButton")

        self.sourceLayout.addWidget(self.browseOutputButton, 1, 2, 1, 1)

        self.keywordLabel = QLabel(self.sourceGroupBox)
        self.keywordLabel.setObjectName(u"keywordLabel")

        self.sourceLayout.addWidget(self.keywordLabel, 2, 0, 1, 1)

        self.keywordEdit = QLineEdit(self.sourceGroupBox)
        self.keywordEdit.setObjectName(u"keywordEdit")

        self.sourceLayout.addWidget(self.keywordEdit, 2, 1, 1, 1)

        self.filterModeComboBox = QComboBox(self.sourceGroupBox)
        self.filterModeComboBox.setObjectName(u"filterModeComboBox")

        self.sourceLayout.addWidget(self.filterModeComboBox, 2, 2, 1, 1)


        self.mainLayout.addWidget(self.sourceGroupBox)

        self.contentSplitter = QSplitter(self.centralwidget)
        self.contentSplitter.setObjectName(u"contentSplitter")
        self.contentSplitter.setOrientation(Qt.Orientation.Vertical)
        self.rulesGroupBox = QGroupBox(self.contentSplitter)
        self.rulesGroupBox.setObjectName(u"rulesGroupBox")
        self.rulesLayout = QVBoxLayout(self.rulesGroupBox)
        self.rulesLayout.setObjectName(u"rulesLayout")
        self.rulesTable = QTableWidget(self.rulesGroupBox)
        if (self.rulesTable.columnCount() < 4):
            self.rulesTable.setColumnCount(4)
        __qtablewidgetitem = QTableWidgetItem()
        self.rulesTable.setHorizontalHeaderItem(0, __qtablewidgetitem)
        __qtablewidgetitem1 = QTableWidgetItem()
        self.rulesTable.setHorizontalHeaderItem(1, __qtablewidgetitem1)
        __qtablewidgetitem2 = QTableWidgetItem()
        self.rulesTable.setHorizontalHeaderItem(2, __qtablewidgetitem2)
        __qtablewidgetitem3 = QTableWidgetItem()
        self.rulesTable.setHorizontalHeaderItem(3, __qtablewidgetitem3)
        self.rulesTable.setObjectName(u"rulesTable")
        self.rulesTable.setMinimumHeight(230)
        self.rulesTable.setEditTriggers(QAbstractItemView.EditTrigger.DoubleClicked|QAbstractItemView.EditTrigger.EditKeyPressed|QAbstractItemView.EditTrigger.SelectedClicked)
        self.rulesTable.setAlternatingRowColors(True)

        self.rulesLayout.addWidget(self.rulesTable)

        self.ruleButtonsLayout = QHBoxLayout()
        self.ruleButtonsLayout.setObjectName(u"ruleButtonsLayout")
        self.addRuleButton = QPushButton(self.rulesGroupBox)
        self.addRuleButton.setObjectName(u"addRuleButton")

        self.ruleButtonsLayout.addWidget(self.addRuleButton)

        self.deleteRuleButton = QPushButton(self.rulesGroupBox)
        self.deleteRuleButton.setObjectName(u"deleteRuleButton")

        self.ruleButtonsLayout.addWidget(self.deleteRuleButton)

        self.sampleRuleButton = QPushButton(self.rulesGroupBox)
        self.sampleRuleButton.setObjectName(u"sampleRuleButton")

        self.ruleButtonsLayout.addWidget(self.sampleRuleButton)

        self.ruleButtonsSpacer = QSpacerItem(40, 20, QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)

        self.ruleButtonsLayout.addItem(self.ruleButtonsSpacer)


        self.rulesLayout.addLayout(self.ruleButtonsLayout)

        self.contentSplitter.addWidget(self.rulesGroupBox)
        self.logGroupBox = QGroupBox(self.contentSplitter)
        self.logGroupBox.setObjectName(u"logGroupBox")
        self.logLayout = QVBoxLayout(self.logGroupBox)
        self.logLayout.setObjectName(u"logLayout")
        self.actionLayout = QHBoxLayout()
        self.actionLayout.setObjectName(u"actionLayout")
        self.startButton = QPushButton(self.logGroupBox)
        self.startButton.setObjectName(u"startButton")
        self.startButton.setMinimumWidth(140)

        self.actionLayout.addWidget(self.startButton)

        self.clearLogButton = QPushButton(self.logGroupBox)
        self.clearLogButton.setObjectName(u"clearLogButton")

        self.actionLayout.addWidget(self.clearLogButton)

        self.currentFileLabel = QLabel(self.logGroupBox)
        self.currentFileLabel.setObjectName(u"currentFileLabel")

        self.actionLayout.addWidget(self.currentFileLabel)

        self.actionSpacer = QSpacerItem(40, 20, QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)

        self.actionLayout.addItem(self.actionSpacer)

        self.countLabel = QLabel(self.logGroupBox)
        self.countLabel.setObjectName(u"countLabel")

        self.actionLayout.addWidget(self.countLabel)


        self.logLayout.addLayout(self.actionLayout)

        self.progressBar = QProgressBar(self.logGroupBox)
        self.progressBar.setObjectName(u"progressBar")
        self.progressBar.setValue(0)

        self.logLayout.addWidget(self.progressBar)

        self.logConsole = QPlainTextEdit(self.logGroupBox)
        self.logConsole.setObjectName(u"logConsole")
        self.logConsole.setMinimumHeight(170)
        self.logConsole.setReadOnly(True)

        self.logLayout.addWidget(self.logConsole)

        self.contentSplitter.addWidget(self.logGroupBox)

        self.mainLayout.addWidget(self.contentSplitter)

        MainWindow.setCentralWidget(self.centralwidget)
        self.statusbar = QStatusBar(MainWindow)
        self.statusbar.setObjectName(u"statusbar")
        MainWindow.setStatusBar(self.statusbar)

        self.retranslateUi(MainWindow)

        QMetaObject.connectSlotsByName(MainWindow)
    # setupUi

    def retranslateUi(self, MainWindow):
        MainWindow.setWindowTitle(QCoreApplication.translate("MainWindow", u"Excel \u5355\u5143\u683c\u5b9a\u5411\u6c47\u603b\u5de5\u5177", None))
        self.titleLabel.setText(QCoreApplication.translate("MainWindow", u"Excel \u5355\u5143\u683c\u5b9a\u5411\u6c47\u603b\u5de5\u5177", None))
        self.subtitleLabel.setText(QCoreApplication.translate("MainWindow", u"\u6279\u91cf\u8bfb\u53d6 Excel \u6307\u5b9a Sheet \u4e0e\u5355\u5143\u683c\u5e76\u6c47\u603b\u8f93\u51fa", None))
        self.helpButton.setText(QCoreApplication.translate("MainWindow", u"\u5e2e\u52a9\u8bf4\u660e", None))
        self.schemeGroupBox.setTitle(QCoreApplication.translate("MainWindow", u"\u65b9\u6848\u7ba1\u7406", None))
        self.schemeNameEdit.setPlaceholderText(QCoreApplication.translate("MainWindow", u"\u65b9\u6848\u540d\u79f0", None))
        self.saveSchemeButton.setText(QCoreApplication.translate("MainWindow", u"\u4fdd\u5b58\u65b9\u6848", None))
        self.loadSchemeButton.setText(QCoreApplication.translate("MainWindow", u"\u8f7d\u5165\u65b9\u6848", None))
        self.deleteSchemeButton.setText(QCoreApplication.translate("MainWindow", u"\u5220\u9664\u65b9\u6848", None))
        self.sourceGroupBox.setTitle(QCoreApplication.translate("MainWindow", u"\u6570\u636e\u6e90\u914d\u7f6e", None))
        self.targetFolderLabel.setText(QCoreApplication.translate("MainWindow", u"\u76ee\u6807\u6587\u4ef6\u5939", None))
        self.targetFolderEdit.setPlaceholderText(QCoreApplication.translate("MainWindow", u"\u9009\u62e9\u5305\u542b Excel \u6587\u4ef6\u7684\u6587\u4ef6\u5939", None))
        self.browseTargetButton.setText(QCoreApplication.translate("MainWindow", u"\u6d4f\u89c8", None))
        self.outputFileLabel.setText(QCoreApplication.translate("MainWindow", u"\u8f93\u51fa\u6587\u4ef6", None))
        self.outputFileEdit.setPlaceholderText(QCoreApplication.translate("MainWindow", u"\u9009\u62e9\u6c47\u603b\u7ed3\u679c\u8f93\u51fa\u8def\u5f84\uff0c\u5efa\u8bae .xlsx", None))
        self.browseOutputButton.setText(QCoreApplication.translate("MainWindow", u"\u6d4f\u89c8", None))
        self.keywordLabel.setText(QCoreApplication.translate("MainWindow", u"\u6587\u4ef6\u540d\u5173\u952e\u8bcd", None))
        self.keywordEdit.setPlaceholderText(QCoreApplication.translate("MainWindow", u"\u4e3a\u7a7a\u65f6\u5904\u7406\u5168\u90e8\u7b26\u5408\u6761\u4ef6\u7684 Excel \u6587\u4ef6", None))
        self.rulesGroupBox.setTitle(QCoreApplication.translate("MainWindow", u"\u89c4\u5219\u914d\u7f6e", None))
        ___qtablewidgetitem = self.rulesTable.horizontalHeaderItem(0)
        ___qtablewidgetitem.setText(QCoreApplication.translate("MainWindow", u"\u8f93\u51fa\u5217\u540d", None))
        ___qtablewidgetitem1 = self.rulesTable.horizontalHeaderItem(1)
        ___qtablewidgetitem1.setText(QCoreApplication.translate("MainWindow", u"Sheet \u6a21\u5f0f", None))
        ___qtablewidgetitem2 = self.rulesTable.horizontalHeaderItem(2)
        ___qtablewidgetitem2.setText(QCoreApplication.translate("MainWindow", u"Sheet \u503c", None))
        ___qtablewidgetitem3 = self.rulesTable.horizontalHeaderItem(3)
        ___qtablewidgetitem3.setText(QCoreApplication.translate("MainWindow", u"\u5355\u5143\u683c", None))
        self.addRuleButton.setText(QCoreApplication.translate("MainWindow", u"\u65b0\u589e\u89c4\u5219", None))
        self.deleteRuleButton.setText(QCoreApplication.translate("MainWindow", u"\u5220\u9664\u9009\u4e2d", None))
        self.sampleRuleButton.setText(QCoreApplication.translate("MainWindow", u"\u586b\u5145\u793a\u4f8b\u89c4\u5219", None))
        self.logGroupBox.setTitle(QCoreApplication.translate("MainWindow", u"\u6267\u884c\u72b6\u6001\u4e0e\u65e5\u5fd7", None))
        self.startButton.setText(QCoreApplication.translate("MainWindow", u"\u5f00\u59cb\u6c47\u603b", None))
        self.clearLogButton.setText(QCoreApplication.translate("MainWindow", u"\u6e05\u7a7a\u65e5\u5fd7", None))
        self.currentFileLabel.setText(QCoreApplication.translate("MainWindow", u"\u5f53\u524d\u5904\u7406\u6587\u4ef6\uff1a-", None))
        self.countLabel.setText(QCoreApplication.translate("MainWindow", u"\u5df2\u5904\u7406 0 / 0", None))
    # retranslateUi

