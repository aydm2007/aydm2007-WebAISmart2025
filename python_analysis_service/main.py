from fastapi import FastAPI
from pydantic import BaseModel
from prophet import Prophet
import pandas as pd
from sklearn.ensemble import IsolationForest
import numpy as np
from typing import List
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Python Analysis Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_methods=["*"],
    allow_headers=["*"],
)

class TimeSeriesData(BaseModel):
    ds: List[str]  # dates in ISO format
    y: List[float]  # values

class NumericData(BaseModel):
    values: List[float]

@app.post("/forecast/")
def forecast(data: TimeSeriesData):
    # Prophet first; fallback to ARIMA if Prophet fails
    try:
        df = pd.DataFrame({"ds": pd.to_datetime(data.ds), "y": data.y})
        model = Prophet()
        model.fit(df)
        future = model.make_future_dataframe(periods=30)
        forecast = model.predict(future)
        response = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(30)
        response["ds"] = response["ds"].dt.strftime('%Y-%m-%d')
        return response.to_dict(orient="records")
    except Exception as e:
        from statsmodels.tsa.arima.model import ARIMA
        ser = pd.Series(data.y, index=pd.to_datetime(data.ds))
        order = (1,1,1)
        try:
            model = ARIMA(ser, order=order)
            model_fit = model.fit()
            forecast = model_fit.forecast(steps=30)
            out = []
            last_date = pd.to_datetime(data.ds[-1])
            for i, yhat in enumerate(forecast):
                ds = (last_date + pd.Timedelta(days=i+1)).strftime('%Y-%m-%d')
                out.append({"ds": ds, "yhat": float(yhat), "yhat_lower": float(yhat), "yhat_upper": float(yhat)})
            return out
        except Exception as e2:
            return [{"ds":"N/A","yhat":0,"yhat_lower":0,"yhat_upper":0,"error":str(e2)}]

@app.post("/detect_anomalies/")
def detect_anomalies(data: NumericData):
    df = pd.DataFrame({"y": data.values})
    iso = IsolationForest(contamination=0.01, random_state=42)
    preds = iso.fit_predict(df)
    anomalies = (preds == -1)
    result = [{"index": i, "value": v, "anomaly": bool(an)} for i, (v, an) in enumerate(zip(data.values, anomalies))]
    return result
