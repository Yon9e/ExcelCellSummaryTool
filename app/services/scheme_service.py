"""方案保存、载入与删除服务。"""

from __future__ import annotations

from datetime import datetime
import gc
import json
from pathlib import Path
import shutil

from app.models.scheme import Scheme
from app.services.path_service import get_backups_dir, get_schemes_path


class SchemeService:
    """管理用户保存在 APPDATA 下的方案文件。"""

    def __init__(self, app_data_dir: str | Path | None = None) -> None:
        self.app_data_dir = Path(app_data_dir) if app_data_dir is not None else None

    @property
    def schemes_path(self) -> Path:
        """返回方案文件路径。"""
        return get_schemes_path(self.app_data_dir)

    def load_all(self) -> dict[str, Scheme]:
        """读取全部方案；JSON 损坏时备份并重建为空方案。"""
        path = self.schemes_path
        if not path.exists():
            return {}
        try:
            with path.open("r", encoding="utf-8") as file:
                data = json.load(file)
            if not isinstance(data, dict):
                raise ValueError("方案文件根节点必须是对象。")
            schemes = {
                name: Scheme.from_dict(value)
                for name, value in data.items()
                if isinstance(name, str) and isinstance(value, dict)
            }
            del data
            gc.collect()
            return schemes
        except (json.JSONDecodeError, OSError, ValueError) as exc:
            self._backup_corrupted_file(path)
            self._write_all({})
            raise ValueError(f"方案文件已损坏，已备份并重建：{exc}") from exc

    def save(self, scheme: Scheme) -> None:
        """保存或覆盖同名方案。"""
        scheme = scheme.normalized()
        scheme.validate_name()
        schemes = self._load_all_safely()
        schemes[scheme.name] = scheme
        self._write_all(schemes)
        del schemes
        gc.collect()

    def get(self, name: str) -> Scheme | None:
        """按名称读取方案。"""
        return self._load_all_safely().get(name)

    def delete(self, name: str) -> bool:
        """删除方案，返回是否实际删除。"""
        schemes = self._load_all_safely()
        if name not in schemes:
            return False
        del schemes[name]
        self._write_all(schemes)
        del schemes
        gc.collect()
        return True

    def names(self) -> list[str]:
        """返回已保存方案名称。"""
        return sorted(self._load_all_safely().keys(), key=str.casefold)

    def _load_all_safely(self) -> dict[str, Scheme]:
        try:
            return self.load_all()
        except ValueError:
            return {}

    def _write_all(self, schemes: dict[str, Scheme]) -> None:
        path = self.schemes_path
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            name: scheme.to_dict()
            for name, scheme in sorted(schemes.items(), key=lambda item: item[0].casefold())
        }
        with path.open("w", encoding="utf-8") as file:
            json.dump(payload, file, ensure_ascii=False, indent=2)
        del payload
        gc.collect()

    def _backup_corrupted_file(self, path: Path) -> None:
        if not path.exists():
            return
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = get_backups_dir(self.app_data_dir)
        backup_path = backup_dir / f"schemes_corrupted_{timestamp}.json"
        shutil.copy2(path, backup_path)
