.PHONY: dev test lint seed migrate install

install:
	pip install -r requirements.txt

dev:
	python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest -q

test-v:
	pytest -v --tb=short

lint:
	python -m py_compile backend/main.py && echo "Lint OK"

seed:
	python -m backend.seed_data

migrate:
	python -m backend.init_db
