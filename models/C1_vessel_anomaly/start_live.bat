@echo off
rem LIVE (needs internet + a free AISStream key): backend + live AIS client + dashboard.
echo Installing the small extra packages (first time only) ...
python -m pip install -q fastapi uvicorn requests websockets
if "%AISSTREAM_KEY%"=="" set /p AISSTREAM_KEY=Paste your AISStream key here and press Enter: 
start "C1 backend" cmd /k "cd /d %~dp0 && python -m uvicorn api_server:app --port 8000"
echo Waiting for the backend to load the model ...
timeout /t 15 /nobreak >nul
start "C1 live AIS client" cmd /k "cd /d %~dp0 && python aisstream_live.py"
start "C1 dashboard" cmd /k "cd /d %~dp0..\.. && set C1_SOURCE=api&& set C1_VIEW=world&& streamlit run models\C1_vessel_anomaly\app.py --server.port 8600"
echo.
echo Three windows opened: backend, live AIS client, dashboard (localhost:8600).
echo The first dots appear after a few minutes. To stop everything: close the three windows.
