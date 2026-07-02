#define MyAppName "Excel 单元格定向汇总工具"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "ExcelCellSummaryTool"
#define MyAppExeName "ExcelCellSummaryTool.exe"
#define ProjectRoot AddBackslash(SourcePath) + "..\"
#define PortableDir ProjectRoot + "release\portable\ExcelCellSummaryTool"

[Setup]
AppId={{9D5D93F0-6C09-4B6A-9FE8-C4D9248A31D1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\ExcelCellSummaryTool
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir={#ProjectRoot}release
OutputBaseFilename=ExcelCellSummaryTool-v0.1.0-win64-setup
SetupIconFile={#ProjectRoot}app\resources\app.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "chinesesimp"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加图标："; Flags: unchecked

[Files]
Source: "{#PortableDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "启动 {#MyAppName}"; Flags: nowait postinstall skipifsilent
