# C1 live demo (PP1)

Flow (no human step): ping -> clean -> per-vessel window -> time-decay GRU autoencoder -> score -> alert -> dashboard / GeoJSON endpoint.

## Run the live dashboard (from the repo root)
    streamlit run models\C1_vessel_anomaly\live_dashboard.py
Press **Start** in the sidebar. The first start calibrates the score scale from data\raw\trawlers_small.csv (once, ~10 s).
If your csv is elsewhere:  set C1_TRAIN_CSV=C:\path\to\trawlers_small.csv   (before the command)

## Run the endpoint (optional, 2 windows) - from models\C1_vessel_anomaly
    pip install fastapi uvicorn requests
    window 1:  uvicorn api_server:app --port 8000        (docs: http://localhost:8000/docs)
    window 2:  python send_to_api.py 20                  (sends 20 pings/second to POST /ping)
    browser :  http://localhost:8000/alerts              (GeoJSON alerts)

## What to say honestly
The feed is a SIMULATED live feed: recorded GFW tracks replayed one ping at a time, with synthetic anomalies
injected into held-out vessels. The input is a replaceable source: any receiver that can POST a ping to /ping works.
Not real-time Sri Lankan AIS.
