; FADT v0.2.7 的一次性安装迁移：替换当前用户安装的 Financial Tool。
; 用户方案和 OCR 设置位于 AppData，不会由旧卸载程序删除。
!macro NSIS_HOOK_PREINSTALL
  ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Financial Tool" "UninstallString"
  ${If} $R0 != ""
    ReadRegStr $R1 HKCU "Software\Yon9e\Financial Tool" ""
    ${If} $R1 == ""
      Abort "检测到旧版 Financial Tool，但无法确定安装位置。请先在 Windows 设置中卸载旧版后再安装 FADT。"
    ${EndIf}
    ${IfNot} ${FileExists} "$R1\uninstall.exe"
      Abort "检测到旧版 Financial Tool，但其卸载程序不可用。请先在 Windows 设置中卸载旧版后再安装 FADT。"
    ${EndIf}

    DetailPrint "正在替换旧版 Financial Tool…"
    ClearErrors
    ExecWait '"$R1\uninstall.exe" /S _?=$R1' $R2
    ${If} ${Errors}
      Abort "无法启动旧版 Financial Tool 的卸载程序。请先在 Windows 设置中卸载旧版后再安装 FADT。"
    ${EndIf}
    ${If} $R2 <> 0
      Abort "旧版 Financial Tool 卸载未完成。请先关闭旧程序并在 Windows 设置中卸载后再安装 FADT。"
    ${EndIf}
  ${EndIf}
!macroend
