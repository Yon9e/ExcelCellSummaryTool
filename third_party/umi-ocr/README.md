# Umi-OCR Runtime

The OCR runtime is downloaded during local setup and release builds. Binary files are not
stored in Git.

Run from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup_umi_ocr.ps1
```

The script verifies the pinned SHA-256 value in `manifest.json` before extracting files to
`third_party\umi-ocr\runtime`.
