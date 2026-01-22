from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
def ping():
    return {"status": "ai ok"}

@app.post("/optimize")
def optimize(data: dict):
    bins = data.get("bins", [])
    # fake AI: sort by fill level desc
    sorted_bins = sorted(bins, key=lambda b: b.get("current_fill", 0), reverse=True)
    return {
        "algorithm": "fake_sort_v1",
        "route": sorted_bins
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
