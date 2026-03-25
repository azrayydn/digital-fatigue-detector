<<<<<<< HEAD
# digital-fatigue-detector
A machine learning project that predicts digital fatigue based on user interaction patterns.
=======
# FlowGuard AI (Python MVP)

FlowGuard AI is a local-first fatigue detection prototype. This setup uses Python and keeps processing on-device.

## Project structure

- `src/desktop_app`: desktop entry-point layer
- `src/engine`: keyboard/mouse tracking and metrics engine
- `src/shared`: shared models and constants
- `tests`: test suite

## Setup

1. Create and activate virtual environment:
   - `python -m venv .venv`
   - `.\.venv\Scripts\Activate.ps1`
2. Install dependencies:
   - `pip install -r requirements.txt`

## Run

- (Önerilen) `python main.py`
- Alternatif: `PYTHONPATH=src python -m desktop_app.main`

>>>>>>> c271fa7 (First working version)
