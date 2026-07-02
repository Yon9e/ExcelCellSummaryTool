# -*- coding: utf-8 -*-

################################################################################
## Form generated from reading UI file 'help_dialog.ui'
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
from PySide6.QtWidgets import (QApplication, QDialog, QHBoxLayout, QPushButton,
    QSizePolicy, QSpacerItem, QTextBrowser, QVBoxLayout,
    QWidget)

class Ui_HelpDialog(object):
    def setupUi(self, HelpDialog):
        if not HelpDialog.objectName():
            HelpDialog.setObjectName(u"HelpDialog")
        HelpDialog.resize(720, 560)
        self.verticalLayout = QVBoxLayout(HelpDialog)
        self.verticalLayout.setObjectName(u"verticalLayout")
        self.verticalLayout.setContentsMargins(14, 14, 14, 14)
        self.helpTextBrowser = QTextBrowser(HelpDialog)
        self.helpTextBrowser.setObjectName(u"helpTextBrowser")

        self.verticalLayout.addWidget(self.helpTextBrowser)

        self.buttonLayout = QHBoxLayout()
        self.buttonLayout.setObjectName(u"buttonLayout")
        self.buttonSpacer = QSpacerItem(40, 20, QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)

        self.buttonLayout.addItem(self.buttonSpacer)

        self.closeButton = QPushButton(HelpDialog)
        self.closeButton.setObjectName(u"closeButton")
        self.closeButton.setMinimumWidth(96)

        self.buttonLayout.addWidget(self.closeButton)


        self.verticalLayout.addLayout(self.buttonLayout)


        self.retranslateUi(HelpDialog)

        QMetaObject.connectSlotsByName(HelpDialog)
    # setupUi

    def retranslateUi(self, HelpDialog):
        HelpDialog.setWindowTitle(QCoreApplication.translate("HelpDialog", u"\u5e2e\u52a9\u8bf4\u660e", None))
        self.closeButton.setText(QCoreApplication.translate("HelpDialog", u"\u5173\u95ed", None))
    # retranslateUi

