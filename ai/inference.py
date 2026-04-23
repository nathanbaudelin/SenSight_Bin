from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import tensorflow as tf
from typing import List

app = FastAPI(title="Smart Waste AI Prediction Service")

try:
    model = tf.keras.models.load_model("models/bin_predictor_v1.h5")
except Exception as e:
    print(f"Error loading model: {e}")

class PredictionRequest(BaseModel):
    bin_id: str
    history: List[List[float]] # Format: [[day, fill, battery], ...]

@app.post("/predict")
async def get_monthly_prediction(request: PredictionRequest):
    # On prend les 60 derniers jours envoyés par le backend
    input_data = np.array([request.history[-60:]])
    prediction = model.predict(input_data)
    
    reshaped_pred = prediction[0].reshape(30, 2)
    fill_forecast = reshaped_pred[:, 0].tolist()
    battery_forecast = reshaped_pred[:, 1].tolist()
    
    return {
        "bin_id": request.bin_id,
        "prediction_unit": "percentage_0_to_1",
        "forecast_days": 30,
        "data": {
            "fill_level": [round(f, 4) for f in fill_forecast],
            "battery_level": [round(b, 4) for b in battery_forecast]
        }
    }