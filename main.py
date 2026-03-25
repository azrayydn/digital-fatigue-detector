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
    # Import after sys.path fix so `from engine import ...` works.
    from desktop_app.main import run  # noqa: WPS433

    result = run()
    print(result)


if __name__ == "__main__":
    main()

