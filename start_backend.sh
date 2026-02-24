#!/bin/bash
cd "$(dirname "$0")"
source .venv/bin/activate
cd backend
export FLASK_ENV=development
python -m src.app
