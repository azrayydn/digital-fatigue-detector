from __future__ import annotations

import os
import sys


def _ensure_src_on_path() -> None:
    project_root = os.path.dirname(__file__)
    src_path = os.path.join(project_root, "src")
    if src_path not in sys.path:
        sys.path.insert(0, src_path)


def main() -> None:
    _ensure_src_on_path()
    from web_app.app import run_server  # noqa: WPS433
    run_server()


if __name__ == "__main__":
    main()
