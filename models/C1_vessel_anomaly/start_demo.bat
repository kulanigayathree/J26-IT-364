@echo off
rem DEMO (no internet, no key): backend + recorded-track feeder + dashboard. Double-click to start everything.
echo Installing the small extra packages (first time only) ...
python -m pip install -q fastapi uvicorn requests websockets
start "C1 backend" cmd /k "cd /d %~dp0 && python -m uvicorn api_server:app --port 8000"
echo Waiting for the backend to load the model ...
timeout /t 15 /nobreak >nul
start "C1 feeder (demo AIS receiver)" cmd /k "cd /d %~dp0 && python auto_feed.py"
start "C1 dashboard" cmd /k "cd /d %~dp0..\.. && set C1_SOURCE=api&& streamlit run models\C1_vessel_anomaly\app.py --server.port 8600"
echo.
echo Three windows opened: backend, feeder, dashboard. The dashboard opens in your browser (localhost:8600).
echo To stop everything: close the three windows.
