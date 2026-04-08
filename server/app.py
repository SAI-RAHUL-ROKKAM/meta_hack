"""
Server entry point for OpenEnv multi-mode deployment.

This module re-exports the FastAPI app from the root app module
and provides a CLI entry point for `[project.scripts]`.
"""

import sys
import os

# Ensure root directory is on path for imports
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _root not in sys.path:
    sys.path.insert(0, _root)

from app import app  # noqa: E402 — re-export the FastAPI app


def main():
    """Entry point for [project.scripts] server command."""
    import uvicorn

    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
