@echo off
title Reef Health Monitor (C3) - keep this window open
cd /d "%~dp0"
if not exist "venv\Scripts\activate.bat" (
  echo [ERROR] venv folder not found in %CD%
  echo Run once:  python -m venv venv  then  venv\Scripts\activate  then  pip install -r requirements.txt
  pause
  exit /b 1
)
call "venv\Scripts\activate.bat"
echo Starting Reef Health Monitor... the browser will open at http://localhost:8501
echo Keep this window open during the demo. Press Ctrl+C here to stop.
streamlit run app.py --server.headless false
pause
