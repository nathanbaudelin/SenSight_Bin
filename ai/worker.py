from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
def ping():
    return {"status": "ai ok"}

@app.post("/predict")
def optimize(body: dict):
    print(body.get("history"))
    return {
        "bin_id": body.get("bin_id"),
        "prediction_unit": 'percentage_0_to_1',
        "data": [ 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9 ],
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
