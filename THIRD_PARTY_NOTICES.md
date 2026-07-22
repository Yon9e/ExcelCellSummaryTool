# Third-Party Notices

FADT redistributes the unmodified Umi-OCR Rapid 2.1.5 Windows package as a separate
local process. The original package URL and SHA-256 are recorded in
`third_party/umi-ocr/manifest.json`.

## Direct Components

| Component | Version | License | Source |
| --- | --- | --- | --- |
| Umi-OCR | 2.1.5 Rapid | MIT | https://github.com/hiroi-sora/Umi-OCR |
| RapidOCR-json | bundled with Umi-OCR | MIT | https://github.com/hiroi-sora/RapidOCR-json |

Copyright (c) 2023 hiroi-sora. The complete notices are included in
`THIRD_PARTY_LICENSES/Umi-OCR-MIT.txt` and
`THIRD_PARTY_LICENSES/RapidOCR-json-MIT.txt`.

## Runtime Dependency Inventory

The following dependencies are present in the official Umi-OCR Rapid 2.1.5 package distributed
with this application. Their original license files are retained inside the OCR runtime and copied
to `THIRD_PARTY_LICENSES` where indicated.

| Component | Version | License | Included notice |
| --- | --- | --- | --- |
| Python runtime | upstream bundled version | PSF and bundled notices | `Python-runtime.txt` |
| fonttools | 4.56.0 | MIT | `fonttools-MIT.txt` |
| Pillow | 10.4.0 | HPND | `Pillow-HPND.txt` |
| psutil | 7.0.0 | BSD-3-Clause | `psutil-BSD-3-Clause.txt` |
| PyMuPDF | 1.24.11 | GNU AGPL-3.0 | `AGPL-3.0.txt` |
| pynput | 1.8.0 | GNU LGPL-3.0 | `pynput-LGPL-3.0.txt` |
| six | 1.17.0 | MIT | `six-MIT.txt` |
| zxing-cpp | 2.2.0 | Apache-2.0 | `Apache-2.0.txt` |

Exact upstream source is available from the project links recorded in each package's bundled
`METADATA` file. In particular, PyMuPDF 1.24.11 source is available at
https://github.com/pymupdf/PyMuPDF/tree/1.24.11 and pynput 1.8.0 source is available at
https://github.com/moses-palmer/pynput/tree/v1.8.0.

OCR images and recognized text are sent only to the bundled service bound to `127.0.0.1`; the
application verifies that the listening process belongs to its private OCR runtime before use.
