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
    QGridLayout, QHBoxLayout, QHeaderView, QLabel,
    QLineEdit, QMainWindow, QPlainTextEdit, QProgressBar,
    QPushButton, QSizePolicy, QSpacerItem, QStackedWidget,
    QStatusBar, QTableWidget, QTableWidgetItem, QVBoxLayout,
    QWidget)

class Ui_MainWindow(object):
    def setupUi(self, MainWindow):
        if not MainWindow.objectName():
            MainWindow.setObjectName(u"MainWindow")
        MainWindow.resize(1360, 860)
        MainWindow.setMinimumSize(QSize(1180, 760))
        self.centralwidget = QWidget(MainWindow)
        self.centralwidget.setObjectName(u"centralwidget")
        self.rootLayout = QHBoxLayout(self.centralwidget)
        self.rootLayout.setSpacing(0)
        self.rootLayout.setObjectName(u"rootLayout")
        self.rootLayout.setContentsMargins(0, 0, 0, 0)
        self.sidebarFrame = QFrame(self.centralwidget)
        self.sidebarFrame.setObjectName(u"sidebarFrame")
        self.sidebarFrame.setMinimumSize(QSize(228, 0))
        self.sidebarFrame.setMaximumSize(QSize(248, 16777215))
        self.sidebarFrame.setFrameShape(QFrame.Shape.NoFrame)
        self.sidebarLayout = QVBoxLayout(self.sidebarFrame)
        self.sidebarLayout.setSpacing(12)
        self.sidebarLayout.setObjectName(u"sidebarLayout")
        self.sidebarLayout.setContentsMargins(28, 40, 24, 28)
        self.sidebarTitleLabel = QLabel(self.sidebarFrame)
        self.sidebarTitleLabel.setObjectName(u"sidebarTitleLabel")

        self.sidebarLayout.addWidget(self.sidebarTitleLabel)

        self.sidebarSubtitleLabel = QLabel(self.sidebarFrame)
        self.sidebarSubtitleLabel.setObjectName(u"sidebarSubtitleLabel")

        self.sidebarLayout.addWidget(self.sidebarSubtitleLabel)

        self.navSchemeButton = QPushButton(self.sidebarFrame)
        self.navSchemeButton.setObjectName(u"navSchemeButton")

        self.sidebarLayout.addWidget(self.navSchemeButton)

        self.navSourceButton = QPushButton(self.sidebarFrame)
        self.navSourceButton.setObjectName(u"navSourceButton")

        self.sidebarLayout.addWidget(self.navSourceButton)

        self.navRulesButton = QPushButton(self.sidebarFrame)
        self.navRulesButton.setObjectName(u"navRulesButton")

        self.sidebarLayout.addWidget(self.navRulesButton)

        self.navRunButton = QPushButton(self.sidebarFrame)
        self.navRunButton.setObjectName(u"navRunButton")

        self.sidebarLayout.addWidget(self.navRunButton)

        self.sidebarSpacer = QSpacerItem(20, 40, QSizePolicy.Policy.Minimum, QSizePolicy.Policy.Expanding)

        self.sidebarLayout.addItem(self.sidebarSpacer)

        self.sidebarHintLabel = QLabel(self.sidebarFrame)
        self.sidebarHintLabel.setObjectName(u"sidebarHintLabel")
        self.sidebarHintLabel.setWordWrap(True)

        self.sidebarLayout.addWidget(self.sidebarHintLabel)


        self.rootLayout.addWidget(self.sidebarFrame)

        self.contentFrame = QFrame(self.centralwidget)
        self.contentFrame.setObjectName(u"contentFrame")
        self.contentFrame.setFrameShape(QFrame.Shape.NoFrame)
        self.mainLayout = QVBoxLayout(self.contentFrame)
        self.mainLayout.setSpacing(12)
        self.mainLayout.setObjectName(u"mainLayout")
        self.mainLayout.setContentsMargins(28, 30, 28, 12)
        self.headerFrame = QFrame(self.contentFrame)
        self.headerFrame.setObjectName(u"headerFrame")
        self.headerFrame.setMinimumSize(QSize(0, 94))
        self.headerFrame.setMaximumSize(QSize(16777215, 112))
        self.headerFrame.setFrameShape(QFrame.Shape.NoFrame)
        self.headerLayout = QHBoxLayout(self.headerFrame)
        self.headerLayout.setObjectName(u"headerLayout")
        self.headerLayout.setContentsMargins(18, 14, 18, 14)
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
        self.helpButton.setMinimumWidth(112)

        self.headerLayout.addWidget(self.helpButton)


        self.mainLayout.addWidget(self.headerFrame)

        self.contentStack = QStackedWidget(self.contentFrame)
        self.contentStack.setObjectName(u"contentStack")
        self.schemePage = QWidget()
        self.schemePage.setObjectName(u"schemePage")
        self.schemePageLayout = QVBoxLayout(self.schemePage)
        self.schemePageLayout.setSpacing(0)
        self.schemePageLayout.setObjectName(u"schemePageLayout")
        self.schemePageLayout.setContentsMargins(0, 0, 0, 0)
        self.schemeGroupBox = QFrame(self.schemePage)
        self.schemeGroupBox.setObjectName(u"schemeGroupBox")
        self.schemeGroupBox.setFrameShape(QFrame.Shape.NoFrame)
        self.schemeLayout = QVBoxLayout(self.schemeGroupBox)
        self.schemeLayout.setSpacing(16)
        self.schemeLayout.setObjectName(u"schemeLayout")
        self.schemeLayout.setContentsMargins(24, 22, 24, 24)
        self.schemeSectionTitleLabel = QLabel(self.schemeGroupBox)
        self.schemeSectionTitleLabel.setObjectName(u"schemeSectionTitleLabel")

        self.schemeLayout.addWidget(self.schemeSectionTitleLabel)

        self.schemeSectionHintLabel = QLabel(self.schemeGroupBox)
        self.schemeSectionHintLabel.setObjectName(u"schemeSectionHintLabel")

        self.schemeLayout.addWidget(self.schemeSectionHintLabel)

        self.schemeFormLayout = QGridLayout()
        self.schemeFormLayout.setObjectName(u"schemeFormLayout")
        self.schemeFormLayout.setHorizontalSpacing(12)
        self.schemeFormLayout.setVerticalSpacing(12)
        self.schemeNameLabel = QLabel(self.schemeGroupBox)
        self.schemeNameLabel.setObjectName(u"schemeNameLabel")

        self.schemeFormLayout.addWidget(self.schemeNameLabel, 0, 0, 1, 1)

        self.schemeNameEdit = QLineEdit(self.schemeGroupBox)
        self.schemeNameEdit.setObjectName(u"schemeNameEdit")

        self.schemeFormLayout.addWidget(self.schemeNameEdit, 0, 1, 1, 1)

        self.schemeSavedLabel = QLabel(self.schemeGroupBox)
        self.schemeSavedLabel.setObjectName(u"schemeSavedLabel")

        self.schemeFormLayout.addWidget(self.schemeSavedLabel, 1, 0, 1, 1)

        self.schemeComboBox = QComboBox(self.schemeGroupBox)
        self.schemeComboBox.setObjectName(u"schemeComboBox")

        self.schemeFormLayout.addWidget(self.schemeComboBox, 1, 1, 1, 1)

        self.schemeButtonsLayout = QHBoxLayout()
        self.schemeButtonsLayout.setSpacing(10)
        self.schemeButtonsLayout.setObjectName(u"schemeButtonsLayout")
        self.saveSchemeButton = QPushButton(self.schemeGroupBox)
        self.saveSchemeButton.setObjectName(u"saveSchemeButton")

        self.schemeButtonsLayout.addWidget(self.saveSchemeButton)

        self.loadSchemeButton = QPushButton(self.schemeGroupBox)
        self.loadSchemeButton.setObjectName(u"loadSchemeButton")

        self.schemeButtonsLayout.addWidget(self.loadSchemeButton)

        self.deleteSchemeButton = QPushButton(self.schemeGroupBox)
        self.deleteSchemeButton.setObjectName(u"deleteSchemeButton")

        self.schemeButtonsLayout.addWidget(self.deleteSchemeButton)

        self.schemeButtonsSpacer = QSpacerItem(40, 20, QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)

        self.schemeButtonsLayout.addItem(self.schemeButtonsSpacer)


        self.schemeFormLayout.addLayout(self.schemeButtonsLayout, 2, 1, 1, 1)


        self.schemeLayout.addLayout(self.schemeFormLayout)

        self.schemePageSpacer = QSpacerItem(20, 280, QSizePolicy.Policy.Minimum, QSizePolicy.Policy.Expanding)

        self.schemeLayout.addItem(self.schemePageSpacer)


        self.schemePageLayout.addWidget(self.schemeGroupBox)

        self.contentStack.addWidget(self.schemePage)
        self.sourcePage = QWidget()
        self.sourcePage.setObjectName(u"sourcePage")
        self.sourcePageLayout = QVBoxLayout(self.sourcePage)
        self.sourcePageLayout.setSpacing(0)
        self.sourcePageLayout.setObjectName(u"sourcePageLayout")
        self.sourcePageLayout.setContentsMargins(0, 0, 0, 0)
        self.sourceGroupBox = QFrame(self.sourcePage)
        self.sourceGroupBox.setObjectName(u"sourceGroupBox")
        self.sourceGroupBox.setFrameShape(QFrame.Shape.NoFrame)
        self.sourceLayout = QVBoxLayout(self.sourceGroupBox)
        self.sourceLayout.setSpacing(16)
        self.sourceLayout.setObjectName(u"sourceLayout")
        self.sourceLayout.setContentsMargins(24, 22, 24, 24)
        self.sourceSectionTitleLabel = QLabel(self.sourceGroupBox)
        self.sourceSectionTitleLabel.setObjectName(u"sourceSectionTitleLabel")

        self.sourceLayout.addWidget(self.sourceSectionTitleLabel)

        self.sourceSectionHintLabel = QLabel(self.sourceGroupBox)
        self.sourceSectionHintLabel.setObjectName(u"sourceSectionHintLabel")

        self.sourceLayout.addWidget(self.sourceSectionHintLabel)

        self.sourceFormLayout = QGridLayout()
        self.sourceFormLayout.setObjectName(u"sourceFormLayout")
        self.sourceFormLayout.setHorizontalSpacing(12)
        self.sourceFormLayout.setVerticalSpacing(12)
        self.targetFolderLabel = QLabel(self.sourceGroupBox)
        self.targetFolderLabel.setObjectName(u"targetFolderLabel")

        self.sourceFormLayout.addWidget(self.targetFolderLabel, 0, 0, 1, 1)

        self.targetFolderEdit = QLineEdit(self.sourceGroupBox)
        self.targetFolderEdit.setObjectName(u"targetFolderEdit")

        self.sourceFormLayout.addWidget(self.targetFolderEdit, 0, 1, 1, 1)

        self.browseTargetButton = QPushButton(self.sourceGroupBox)
        self.browseTargetButton.setObjectName(u"browseTargetButton")

        self.sourceFormLayout.addWidget(self.browseTargetButton, 0, 2, 1, 1)

        self.outputFileLabel = QLabel(self.sourceGroupBox)
        self.outputFileLabel.setObjectName(u"outputFileLabel")

        self.sourceFormLayout.addWidget(self.outputFileLabel, 1, 0, 1, 1)

        self.outputFileEdit = QLineEdit(self.sourceGroupBox)
        self.outputFileEdit.setObjectName(u"outputFileEdit")

        self.sourceFormLayout.addWidget(self.outputFileEdit, 1, 1, 1, 1)

        self.browseOutputButton = QPushButton(self.sourceGroupBox)
        self.browseOutputButton.setObjectName(u"browseOutputButton")

        self.sourceFormLayout.addWidget(self.browseOutputButton, 1, 2, 1, 1)

        self.keywordLabel = QLabel(self.sourceGroupBox)
        self.keywordLabel.setObjectName(u"keywordLabel")

        self.sourceFormLayout.addWidget(self.keywordLabel, 2, 0, 1, 1)

        self.keywordEdit = QLineEdit(self.sourceGroupBox)
        self.keywordEdit.setObjectName(u"keywordEdit")

        self.sourceFormLayout.addWidget(self.keywordEdit, 2, 1, 1, 1)

        self.filterModeComboBox = QComboBox(self.sourceGroupBox)
        self.filterModeComboBox.setObjectName(u"filterModeComboBox")

        self.sourceFormLayout.addWidget(self.filterModeComboBox, 2, 2, 1, 1)


        self.sourceLayout.addLayout(self.sourceFormLayout)

        self.sourcePageSpacer = QSpacerItem(20, 280, QSizePolicy.Policy.Minimum, QSizePolicy.Policy.Expanding)

        self.sourceLayout.addItem(self.sourcePageSpacer)


        self.sourcePageLayout.addWidget(self.sourceGroupBox)

        self.contentStack.addWidget(self.sourcePage)
        self.rulesPage = QWidget()
        self.rulesPage.setObjectName(u"rulesPage")
        self.rulesPageLayout = QVBoxLayout(self.rulesPage)
        self.rulesPageLayout.setSpacing(0)
        self.rulesPageLayout.setObjectName(u"rulesPageLayout")
        self.rulesPageLayout.setContentsMargins(0, 0, 0, 0)
        self.rulesGroupBox = QFrame(self.rulesPage)
        self.rulesGroupBox.setObjectName(u"rulesGroupBox")
        self.rulesGroupBox.setFrameShape(QFrame.Shape.NoFrame)
        self.rulesLayout = QVBoxLayout(self.rulesGroupBox)
        self.rulesLayout.setSpacing(14)
        self.rulesLayout.setObjectName(u"rulesLayout")
        self.rulesLayout.setContentsMargins(24, 22, 24, 24)
        self.rulesHeaderLayout = QHBoxLayout()
        self.rulesHeaderLayout.setSpacing(12)
        self.rulesHeaderLayout.setObjectName(u"rulesHeaderLayout")
        self.rulesTitleLayout = QVBoxLayout()
        self.rulesTitleLayout.setSpacing(4)
        self.rulesTitleLayout.setObjectName(u"rulesTitleLayout")
        self.rulesSectionTitleLabel = QLabel(self.rulesGroupBox)
        self.rulesSectionTitleLabel.setObjectName(u"rulesSectionTitleLabel")

        self.rulesTitleLayout.addWidget(self.rulesSectionTitleLabel)

        self.rulesSectionHintLabel = QLabel(self.rulesGroupBox)
        self.rulesSectionHintLabel.setObjectName(u"rulesSectionHintLabel")

        self.rulesTitleLayout.addWidget(self.rulesSectionHintLabel)


        self.rulesHeaderLayout.addLayout(self.rulesTitleLayout)

        self.rulesHeaderSpacer = QSpacerItem(40, 20, QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)

        self.rulesHeaderLayout.addItem(self.rulesHeaderSpacer)

        self.ruleButtonsLayout = QHBoxLayout()
        self.ruleButtonsLayout.setSpacing(10)
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


        self.rulesHeaderLayout.addLayout(self.ruleButtonsLayout)


        self.rulesLayout.addLayout(self.rulesHeaderLayout)

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
        self.rulesTable.setMinimumHeight(420)
        self.rulesTable.setEditTriggers(QAbstractItemView.EditTrigger.DoubleClicked|QAbstractItemView.EditTrigger.EditKeyPressed|QAbstractItemView.EditTrigger.SelectedClicked)
        self.rulesTable.setAlternatingRowColors(True)

        self.rulesLayout.addWidget(self.rulesTable)


        self.rulesPageLayout.addWidget(self.rulesGroupBox)

        self.contentStack.addWidget(self.rulesPage)
        self.runPage = QWidget()
        self.runPage.setObjectName(u"runPage")
        self.runPageLayout = QVBoxLayout(self.runPage)
        self.runPageLayout.setSpacing(0)
        self.runPageLayout.setObjectName(u"runPageLayout")
        self.runPageLayout.setContentsMargins(0, 0, 0, 0)
        self.logGroupBox = QFrame(self.runPage)
        self.logGroupBox.setObjectName(u"logGroupBox")
        self.logGroupBox.setFrameShape(QFrame.Shape.NoFrame)
        self.logLayout = QVBoxLayout(self.logGroupBox)
        self.logLayout.setSpacing(14)
        self.logLayout.setObjectName(u"logLayout")
        self.logLayout.setContentsMargins(24, 22, 24, 24)
        self.logSectionTitleLabel = QLabel(self.logGroupBox)
        self.logSectionTitleLabel.setObjectName(u"logSectionTitleLabel")

        self.logLayout.addWidget(self.logSectionTitleLabel)

        self.actionLayout = QHBoxLayout()
        self.actionLayout.setSpacing(10)
        self.actionLayout.setObjectName(u"actionLayout")
        self.startButton = QPushButton(self.logGroupBox)
        self.startButton.setObjectName(u"startButton")
        self.startButton.setMinimumWidth(142)

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
        self.progressBar.setMaximumSize(QSize(16777215, 18))
        self.progressBar.setValue(0)

        self.logLayout.addWidget(self.progressBar)

        self.logConsole = QPlainTextEdit(self.logGroupBox)
        self.logConsole.setObjectName(u"logConsole")
        self.logConsole.setMinimumHeight(420)
        self.logConsole.setReadOnly(True)

        self.logLayout.addWidget(self.logConsole)


        self.runPageLayout.addWidget(self.logGroupBox)

        self.contentStack.addWidget(self.runPage)

        self.mainLayout.addWidget(self.contentStack)


        self.rootLayout.addWidget(self.contentFrame)

        MainWindow.setCentralWidget(self.centralwidget)
        self.statusbar = QStatusBar(MainWindow)
        self.statusbar.setObjectName(u"statusbar")
        MainWindow.setStatusBar(self.statusbar)

        self.retranslateUi(MainWindow)

        self.contentStack.setCurrentIndex(2)


        QMetaObject.connectSlotsByName(MainWindow)
    # setupUi

    def retranslateUi(self, MainWindow):
        MainWindow.setWindowTitle(QCoreApplication.translate("MainWindow", u"Excel \u5355\u5143\u683c\u5b9a\u5411\u6c47\u603b\u5de5\u5177", None))
        self.sidebarTitleLabel.setText(QCoreApplication.translate("MainWindow", u"Excel \u6c47\u603b\u5de5\u4f5c\u53f0", None))
        self.sidebarSubtitleLabel.setText(QCoreApplication.translate("MainWindow", u"\u5ba1\u8ba1\u4e0e\u8d22\u52a1\u81ea\u52a8\u5316", None))
        self.navSchemeButton.setText(QCoreApplication.translate("MainWindow", u"\u65b9\u6848\u7ba1\u7406", None))
        self.navSourceButton.setText(QCoreApplication.translate("MainWindow", u"\u6570\u636e\u6e90\u914d\u7f6e", None))
        self.navRulesButton.setText(QCoreApplication.translate("MainWindow", u"\u89c4\u5219\u914d\u7f6e", None))
        self.navRunButton.setText(QCoreApplication.translate("MainWindow", u"\u6267\u884c\u4e0e\u65e5\u5fd7", None))
        self.sidebarHintLabel.setText(QCoreApplication.translate("MainWindow", u"\u975e\u9012\u5f52\u626b\u63cf\u76ee\u6807\u76ee\u5f55\n"
"\u652f\u6301 .xlsx / .xlsm / .xltx / .xltm\n"
"\u516c\u5f0f\u8bfb\u53d6\u5df2\u4fdd\u5b58\u7f13\u5b58\u503c", None))
        self.titleLabel.setText(QCoreApplication.translate("MainWindow", u"Excel \u5355\u5143\u683c\u5b9a\u5411\u6c47\u603b\u5de5\u5177", None))
        self.subtitleLabel.setText(QCoreApplication.translate("MainWindow", u"\u6279\u91cf\u8bfb\u53d6 Excel \u6307\u5b9a Sheet \u4e0e\u5355\u5143\u683c\u5e76\u6c47\u603b\u8f93\u51fa", None))
        self.helpButton.setText(QCoreApplication.translate("MainWindow", u"\u5e2e\u52a9\u8bf4\u660e", None))
        self.schemeSectionTitleLabel.setText(QCoreApplication.translate("MainWindow", u"\u65b9\u6848\u7ba1\u7406", None))
        self.schemeSectionHintLabel.setText(QCoreApplication.translate("MainWindow", u"\u4fdd\u5b58\u3001\u8f7d\u5165\u6216\u5220\u9664\u5e38\u7528\u6c47\u603b\u65b9\u6848\uff0c\u4fbf\u4e8e\u91cd\u590d\u6267\u884c\u540c\u4e00\u7c7b\u53d6\u6570\u4efb\u52a1\u3002", None))
        self.schemeNameLabel.setText(QCoreApplication.translate("MainWindow", u"\u65b9\u6848\u540d\u79f0", None))
        self.schemeNameEdit.setPlaceholderText(QCoreApplication.translate("MainWindow", u"\u65b9\u6848\u540d\u79f0", None))
        self.schemeSavedLabel.setText(QCoreApplication.translate("MainWindow", u"\u5df2\u4fdd\u5b58\u65b9\u6848", None))
        self.saveSchemeButton.setText(QCoreApplication.translate("MainWindow", u"\u4fdd\u5b58\u65b9\u6848", None))
        self.loadSchemeButton.setText(QCoreApplication.translate("MainWindow", u"\u8f7d\u5165\u65b9\u6848", None))
        self.deleteSchemeButton.setText(QCoreApplication.translate("MainWindow", u"\u5220\u9664\u65b9\u6848", None))
        self.sourceSectionTitleLabel.setText(QCoreApplication.translate("MainWindow", u"\u6570\u636e\u6e90\u914d\u7f6e", None))
        self.sourceSectionHintLabel.setText(QCoreApplication.translate("MainWindow", u"\u9009\u62e9\u5f85\u626b\u63cf\u7684\u76ee\u6807\u76ee\u5f55\u3001\u8f93\u51fa\u6587\u4ef6\u548c\u6587\u4ef6\u540d\u7b5b\u9009\u53e3\u5f84\u3002", None))
        self.targetFolderLabel.setText(QCoreApplication.translate("MainWindow", u"\u76ee\u6807\u6587\u4ef6\u5939", None))
        self.targetFolderEdit.setPlaceholderText(QCoreApplication.translate("MainWindow", u"\u9009\u62e9\u5305\u542b Excel \u6587\u4ef6\u7684\u6587\u4ef6\u5939", None))
        self.browseTargetButton.setText(QCoreApplication.translate("MainWindow", u"\u6d4f\u89c8", None))
        self.outputFileLabel.setText(QCoreApplication.translate("MainWindow", u"\u8f93\u51fa\u6587\u4ef6", None))
        self.outputFileEdit.setPlaceholderText(QCoreApplication.translate("MainWindow", u"\u9009\u62e9\u6c47\u603b\u7ed3\u679c\u8f93\u51fa\u8def\u5f84\uff0c\u5efa\u8bae .xlsx", None))
        self.browseOutputButton.setText(QCoreApplication.translate("MainWindow", u"\u6d4f\u89c8", None))
        self.keywordLabel.setText(QCoreApplication.translate("MainWindow", u"\u5173\u952e\u8bcd", None))
        self.keywordEdit.setPlaceholderText(QCoreApplication.translate("MainWindow", u"\u4e3a\u7a7a\u65f6\u5904\u7406\u5168\u90e8\u7b26\u5408\u6761\u4ef6\u7684 Excel \u6587\u4ef6", None))
        self.rulesSectionTitleLabel.setText(QCoreApplication.translate("MainWindow", u"\u89c4\u5219\u914d\u7f6e", None))
        self.rulesSectionHintLabel.setText(QCoreApplication.translate("MainWindow", u"\u914d\u7f6e\u8f93\u51fa\u5217\u3001Sheet \u5b9a\u4f4d\u65b9\u5f0f\u548c\u76ee\u6807\u5355\u5143\u683c\uff1b\u8868\u683c\u652f\u6301\u53cc\u51fb\u7f16\u8f91\u3002", None))
        self.addRuleButton.setText(QCoreApplication.translate("MainWindow", u"\u65b0\u589e\u89c4\u5219", None))
        self.deleteRuleButton.setText(QCoreApplication.translate("MainWindow", u"\u5220\u9664\u9009\u4e2d", None))
        self.sampleRuleButton.setText(QCoreApplication.translate("MainWindow", u"\u586b\u5145\u793a\u4f8b\u89c4\u5219", None))
        ___qtablewidgetitem = self.rulesTable.horizontalHeaderItem(0)
        ___qtablewidgetitem.setText(QCoreApplication.translate("MainWindow", u"\u8f93\u51fa\u5217\u540d", None))
        ___qtablewidgetitem1 = self.rulesTable.horizontalHeaderItem(1)
        ___qtablewidgetitem1.setText(QCoreApplication.translate("MainWindow", u"Sheet \u6a21\u5f0f", None))
        ___qtablewidgetitem2 = self.rulesTable.horizontalHeaderItem(2)
        ___qtablewidgetitem2.setText(QCoreApplication.translate("MainWindow", u"Sheet \u503c", None))
        ___qtablewidgetitem3 = self.rulesTable.horizontalHeaderItem(3)
        ___qtablewidgetitem3.setText(QCoreApplication.translate("MainWindow", u"\u5355\u5143\u683c", None))
        self.logSectionTitleLabel.setText(QCoreApplication.translate("MainWindow", u"\u6267\u884c\u72b6\u6001\u4e0e\u65e5\u5fd7", None))
        self.startButton.setText(QCoreApplication.translate("MainWindow", u"\u5f00\u59cb\u6c47\u603b", None))
        self.clearLogButton.setText(QCoreApplication.translate("MainWindow", u"\u6e05\u7a7a\u65e5\u5fd7", None))
        self.currentFileLabel.setText(QCoreApplication.translate("MainWindow", u"\u5f53\u524d\u5904\u7406\u6587\u4ef6\uff1a-", None))
        self.countLabel.setText(QCoreApplication.translate("MainWindow", u"\u5df2\u5904\u7406 0 / 0", None))
    # retranslateUi

