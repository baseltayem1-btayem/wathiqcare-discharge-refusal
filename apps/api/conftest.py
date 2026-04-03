"""
Pytest root conftest — ensures apps/api/ is on sys.path so that
`from backend.xxx import ...` works regardless of where pytest is invoked from.
"""
import sys
from pathlib import Path

# Add apps/api/ to the Python path so the `backend` package is importable.
sys.path.insert(0, str(Path(__file__).parent))
