import tensorflow as tf
import pandas as pd
import numpy as np
from tensorflow.keras import layers
from sklearn.preprocessing import MinMaxScaler

df = pd.read_csv("data/daily_waste_battery_data.csv")
scaler = MinMaxScaler()
data_scaled = scaler.fit_transform(df[['day', 'fill_level', 'battery_level']])

def create_sequences(data, lookback=60, forecast=30):
    X, y = [], []
    for i in range(len(data) - lookback - forecast):
        X.append(data[i : i + lookback])
        # On prédit fill_level (index 1) et battery_level (index 2)
        y.append(data[i + lookback : i + lookback + forecast, 1:3])
    return np.array(X), np.array(y)

X, y = create_sequences(data_scaled)
y_reshaped = y.reshape(y.shape[0], -1)

# LSTM Multi-Output
model = tf.keras.Sequential([
    layers.Input(shape=(60, 3)),
    layers.LSTM(100, return_sequences=True),
    layers.LSTM(50),
    layers.Dense(128, activation='relu'),
    layers.Dense(60) # 30 jours * 2 valeurs (remplissage + batterie)
])

model.compile(optimizer='adam', loss='mse')
model.fit(X, y_reshaped, epochs=30, batch_size=16)
model.save("models/daily_bin_predictor.h5")