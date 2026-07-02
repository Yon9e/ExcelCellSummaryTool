"""Excel 文件筛选服务。"""

from __future__ import annotations

from pathlib import Path


EXCEL_EXTENSIONS = {".xlsx", ".xlsm", ".xltx", ".xltm"}
FILTER_MODE_INCLUDE = "include"
FILTER_MODE_EXCLUDE = "exclude"


def list_excel_files(
    target_folder: str | Path,
    keyword: str = "",
    filter_mode: str = FILTER_MODE_INCLUDE,
    recursive: bool = False,
) -> list[Path]:
    """按文件名关键词筛选目标文件夹中的 Excel 文件。"""
    folder = Path(target_folder).expanduser()
    if not folder.exists():
        raise FileNotFoundError(f"目标文件夹不存在：{folder}")
    if not folder.is_dir():
        raise NotADirectoryError(f"目标路径不是文件夹：{folder}")

    mode = filter_mode.strip().lower()
    if mode not in {FILTER_MODE_INCLUDE, FILTER_MODE_EXCLUDE}:
        raise ValueError("筛选模式必须是 include 或 exclude。")

    clean_keyword = keyword.strip()
    iterator = folder.rglob("*") if recursive else folder.iterdir()
    files: list[Path] = []
    for path in iterator:
        if not path.is_file():
            continue
        if path.name.startswith("~$"):
            continue
        if path.suffix.lower() not in EXCEL_EXTENSIONS:
            continue
        if clean_keyword:
            matched = clean_keyword in path.name
            if mode == FILTER_MODE_INCLUDE and not matched:
                continue
            if mode == FILTER_MODE_EXCLUDE and matched:
                continue
        files.append(path)

    return sorted(files, key=lambda item: item.name.casefold())
