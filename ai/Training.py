import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras import layers, Sequential

# dataset load
df = pd.read_csv("data/synthetic_waste_data.csv")

# normalise data
scaler = MinMaxScaler()
df['fill_norm'] = scaler.fit_transform(df[['fill_level']])

# create sliding window for 1 week data input and 1 week data output
def create_sequences(data, window_size=168):
    X, y = [], []
    for i in range(len(data) - (2 * window_size)):
        X.append(data[i : i + window_size])
        y.append(data[i + window_size : i + (2 * window_size)])
    return np.array(X), np.array(y)

# features
features = df[['fill_norm', 'day_of_week', 'hour']].values
X, y = create_sequences(features)

# reshape on 168h to match 1 week worth of data
y = y[:, :, 0] 

# split dataset with 80% training and 20% testing
split = int(0.8 * len(X))
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

# model
model = Sequential([
    layers.Input(shape=(X_train.shape[1], X_train.shape[2])),
    layers.LSTM(128, return_sequences=True),
    layers.Dropout(0.2),
    layers.LSTM(64),
    layers.Dense(256, activation='relu'),
    layers.Dense(168, activation='sigmoid') # Predicting 168 hours of fill in %
])

model.compile(optimizer='adam', loss='mse', metrics=['mae'])

# training
print("Starting training...")
history = model.fit(
    X_train, y_train,
    epochs=20,
    batch_size=32,
    validation_data=(X_test, y_test),
    verbose=1
)

# save 
model.save("models/bin_predictor_v1.h5")
print("Model trained and saved as models/bin_predictor_v1.h5")