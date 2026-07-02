"""编译 Qt Designer .ui 文件。"""

from __future__ import annotations

from pathlib import Path
import shutil
import site
import subprocess
import sys
import sysconfig


PROJECT_ROOT = Path(__file__).resolve().parents[1]
UI_JOBS = [
    (
        PROJECT_ROOT / "app" / "ui" / "forms" / "main_window.ui",
        PROJECT_ROOT / "app" / "ui" / "generated" / "ui_main_window.py",
    ),
    (
        PROJECT_ROOT / "app" / "ui" / "forms" / "help_dialog.ui",
        PROJECT_ROOT / "app" / "ui" / "generated" / "ui_help_dialog.py",
    ),
]


def find_pyside6_uic() -> Path:
    """查找 pyside6-uic 可执行文件。"""
    from_path = shutil.which("pyside6-uic")
    candidates: list[Path] = []
    if from_path:
        candidates.append(Path(from_path))
    if sys.platform.startswith("win"):
        candidates.extend(
            [
                Path(site.getuserbase()) / "Scripts" / "pyside6-uic.exe",
                Path(site.getusersitepackages()).parent / "Scripts" / "pyside6-uic.exe",
                Path(sysconfig.get_path("scripts", "nt_user")) / "pyside6-uic.exe",
                Path(sys.executable).resolve().parent / "Scripts" / "pyside6-uic.exe",
            ]
        )
    else:
        candidates.extend(
            [
                Path(site.getuserbase()) / "bin" / "pyside6-uic",
                Path(sys.executable).resolve().parent / "pyside6-uic",
            ]
        )
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("未找到 pyside6-uic，请确认 PySide6 已完整安装。")


def compile_ui_file(uic_path: Path, source: Path, target: Path) -> None:
    """编译单个 .ui 文件。"""
    if not source.exists():
        raise FileNotFoundError(f"UI 源文件不存在：{source}")
    target.parent.mkdir(parents=True, exist_ok=True)
    command = [str(uic_path), str(source), "-o", str(target)]
    print(f"编译 UI：{source} -> {target}")
    subprocess.run(command, cwd=PROJECT_ROOT, check=True, timeout=60)


def main() -> int:
    """执行全部 UI 编译任务。"""
    try:
        uic_path = find_pyside6_uic()
        print(f"使用 pyside6-uic：{uic_path}")
        for source, target in UI_JOBS:
            compile_ui_file(uic_path, source, target)
        print("UI 编译完成。")
        return 0
    except Exception as exc:
        print(f"UI 编译失败：{exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
