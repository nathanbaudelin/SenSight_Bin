import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_daily_bin_data(bin_id, years=2):
    start_date = datetime.now() - timedelta(days=years*365)
    timestamps = [start_date + timedelta(days=i) for i in range(years*365)]
    
    data = []
    current_fill = np.random.uniform(0, 20)
    current_battery = 100.0
    
    for ts in timestamps:
        day_of_year = ts.timetuple().tm_yday
        is_weekend = ts.weekday() >= 5
        
        # 1. Remplissage : Croissance quotidienne
        growth = np.random.uniform(5, 12)
        if is_weekend: growth *= 1.4 # Plus de déchets le weekend
        current_fill += growth
        
        # Événement de collecte (tous les ~5 jours ou si > 90%)
        if current_fill > 90 or (ts.weekday() == 2): # Collecte fixe le mercredi
            current_fill = np.random.uniform(0, 5)
            
        # 2. Batterie : Décharge quotidienne + Charge solaire
        # Décharge : ~0.5% par jour + pic lors de la transmission
        discharge = np.random.uniform(0.3, 0.7) 
        # Solaire : Recharge si beau temps (simplifié par saison)
        is_sunny = np.random.random() > 0.3 if 120 < day_of_year < 270 else np.random.random() > 0.6
        recharge = np.random.uniform(0.2, 1.0) if is_sunny else 0
        
        current_battery = max(min(current_battery - discharge + recharge, 100), 0)
        
        data.append({
            "day": ts.timetuple().tm_yday,
            "fill_level": round(min(current_fill, 100), 2),
            "battery_level": round(current_battery, 2)
        })
        
    return pd.DataFrame(data)

df_daily = generate_daily_bin_data("BIN-001")
df_daily.to_csv("daily_waste_battery_data.csv", index=False)