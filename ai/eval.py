import pandas as pd
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error

# load model and data
df = pd.read_csv("data/synthetic_waste_data.csv")
# Load the model without compiling it to avoid errors
model = tf.keras.models.load_model("models/bin_predictor_v1.h5", compile=False)
# Manually compile
model.compile(optimizer='adam', loss='mse', metrics=['mae'])

# data preparation
scaler = MinMaxScaler()
df['fill_norm'] = scaler.fit_transform(df[['fill_level']])

def create_sequences(data, window_size=168):
    X, y = [], []
    for i in range(len(data) - (2 * window_size)):
        X.append(data[i : i + window_size])
        y.append(data[i + window_size : i + (2 * window_size), 0]) # Target is only fill_norm
    return np.array(X), np.array(y)

features = df[['fill_norm', 'day_of_week', 'hour']].values
X, y = create_sequences(features)

# Split to get the same 20% test set used in training
split = int(0.8 * len(X))
X_test, y_test = X[split:], y[split:]

# inference on test set
print("Evaluating model...")
predictions = model.predict(X_test)

# calculate final metrics
y_test_flat = y_test.flatten()
preds_flat = predictions.flatten()

mae = mean_absolute_error(y_test_flat, preds_flat)
rmse = np.sqrt(mean_squared_error(y_test_flat, preds_flat))

print(f"\n--- EVALUATION RESULTS ---")
print(f"Mean Absolute Error (MAE): {mae:.4f} (approx {mae*100:.2f}%)")
print(f"Root Mean Squared Error (RMSE): {rmse:.4f}")
print(f"AI Prediction Accuracy: {(1-mae)*100:.2f}%")

# random 1 week forecast
sample_idx = np.random.randint(0, len(X_test))
plt.figure(figsize=(12, 6))
plt.plot(y_test[sample_idx], label='Actual Fill Level', color='blue', linewidth=2)
plt.plot(predictions[sample_idx], label='AI Prediction', color='red', linestyle='--', linewidth=2)
plt.title(f'7-Day Forecast Validation (Bin BCN-CT-001)')
plt.xlabel('Hours in the Future')
plt.ylabel('Fill Level (%)')
plt.legend()
plt.grid(True, alpha=0.3)
plt.savefig('evaluation_forecast.png')
print("\nPlot saved as evaluation_forecast.png")