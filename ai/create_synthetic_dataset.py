import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_bin_data(bin_id, days=30, interval_min=60):
    start_date = datetime.now() - timedelta(days=days)
    periods = (days * 24 * 60) // interval_min
    timestamps = [start_date + timedelta(minutes=i * interval_min) for i in range(periods)]

    data = []
    current_fill = np.random.uniform(0, 20)
    
    for ts in timestamps:
        day_week = ts.weekday()
        hour = ts.hour

        if 8 <= hour <= 22:
            hourly_growth = np.random.uniform(0.5, 2.0)
        else:
            hourly_growth = np.random.uniform(0.0, 0.4)

        if day_week >= 4: 
            hourly_growth *= 1.5
            
        current_fill += hourly_growth

        if current_fill > 90 or (day_week in [1, 4] and hour == 6):
            current_fill = np.random.uniform(0, 5)

        fill_percent = min(max(current_fill, 0), 100)

        noise = np.random.normal(0, 0.5)
        fill_percent = min(max(fill_percent + noise, 0), 100)
        
        data.append({
            "timestamp": ts,
            "bin_id": bin_id,
            "fill_level": round(fill_percent, 2),
            "day_of_week": day_week,
            "hour": hour
        })
        
    return pd.DataFrame(data)

df_synthetic = generate_bin_data(bin_id="BCN-CT-001", days=60)
print(df_synthetic.head(10))

df_synthetic.to_csv("synthetic_waste_data.csv", index=False)