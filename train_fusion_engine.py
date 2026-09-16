import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
import joblib

np.random.seed(42)
N_SAMPLES = 5000

print("Simulating base model output matrices...")

# Probabilities / anomaly scores from Models 1, 2, and 3
kinetic_fall_prob = np.random.uniform(0.0, 1.0, N_SAMPLES)      # Model #1 (SisFall XGBoost)
physio_anomaly_score = np.random.uniform(0.0, 1.0, N_SAMPLES)   # Model #2 (Biometric IsoForest)
env_hazard_prob = np.random.uniform(0.0, 1.0, N_SAMPLES)        # Model #3 (UCI Gas RF)

# Multi-modal risk fusion calculation
weighted_score = (0.45 * kinetic_fall_prob) + (0.35 * physio_anomaly_score) + (0.20 * env_hazard_prob)

# Threat level mapping
risk_class = np.where(weighted_score > 0.65, 2, np.where(weighted_score > 0.35, 1, 0))

df_fusion = pd.DataFrame({
    'kinetic_prob': kinetic_fall_prob,
    'physio_score': physio_anomaly_score,
    'env_prob': env_hazard_prob,
    'risk_level': risk_class
})

X = df_fusion[['kinetic_prob', 'physio_score', 'env_prob']]
y = df_fusion['risk_level']

print("Training Model #4 (Gradient Boosting Risk Fusion Engine)...")
fusion_model = GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42)
fusion_model.fit(X, y)

joblib.dump(fusion_model, 'risk_fusion_gbc.pkl')
print("Model #4 saved -> risk_fusion_gbc.pkl")