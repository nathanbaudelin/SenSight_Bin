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
    history: List[List[float]] 

@app.post("/predict")
async def predict_fill_level(request: PredictionRequest):
    if len(request.history) != 168:
        raise HTTPException(status_code=400, detail="History must contain exactly 168 hours of data.")

    try:
        input_data = np.array([request.history])
        prediction = model.predict(input_data)
        predicted_values = prediction[0].tolist()
        
        return {
            "bin_id": request.bin_id,
            "prediction_unit": "percentage_0_to_1",
            "forecast_hours": 168,
            "data": [round(val, 4) for val in predicted_values]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)