import os
import joblib
import numpy as np
import pandas as pd

class WorkerSafetyAIEngine:
    def __init__(self, model_dir="."):
        # Load all 4 model binaries
        self.kinetic_model = joblib.load(os.path.join(model_dir, "xgb_crisis_classifier.pkl"))
        self.physio_model = joblib.load(os.path.join(model_dir, "iso_forest_biometrics.pkl"))
        self.env_model = joblib.load(os.path.join(model_dir, "env_hazard_rf.pkl"))
        self.fusion_model = joblib.load(os.path.join(model_dir, "risk_fusion_gbc.pkl"))
        print("[AI Engine] All 4 model binaries loaded successfully.")

    def _extract_kinetic_features(self, imu_window):
        """
        Transforms raw IMU window sequence into 14 engineered features.
        """
        arr = np.array(imu_window)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)
            
        if arr.shape[1] < 6:
            pad = np.zeros((arr.shape[0], 6 - arr.shape[1]))
            arr = np.hstack([arr, pad])
            
        ax, ay, az = arr[:, 0], arr[:, 1], arr[:, 2]
        gx, gy, gz = arr[:, 3], arr[:, 4], arr[:, 5]

        g_mag = np.sqrt(ax**2 + ay**2 + az**2)
        jerk = np.diff(g_mag, prepend=g_mag[0])

        pitch = np.degrees(np.arctan2(ax, np.sqrt(ay**2 + az**2)))
        roll = np.degrees(np.arctan2(ay, np.sqrt(ax**2 + az**2)))

        features = {
            'max_g': float(np.max(g_mag)),
            'min_g': float(np.min(g_mag)),
            'range_g': float(np.ptp(g_mag)),
            'mean_g': float(np.mean(g_mag)),
            'std_g': float(np.std(g_mag)),
            'max_jerk': float(np.max(np.abs(jerk))),
            'std_jerk': float(np.std(jerk)),
            'pitch_range': float(np.ptp(pitch)),
            'roll_range': float(np.ptp(roll)),
            'final_pitch': float(pitch[-1]),
            'final_roll': float(roll[-1]),
            'accel_x_max': float(np.max(np.abs(ax))),
            'accel_y_max': float(np.max(np.abs(ay))),
            'accel_z_max': float(np.max(np.abs(az)))
        }
        
        expected_cols = [
            'max_g', 'min_g', 'range_g', 'mean_g', 'std_g', 'max_jerk', 
            'std_jerk', 'pitch_range', 'roll_range', 'final_pitch', 
            'final_roll', 'accel_x_max', 'accel_y_max', 'accel_z_max'
        ]
        return pd.DataFrame([features])[expected_cols]

    def evaluate_telemetry(self, raw_imu_data, physio_features, env_features):
        """
        Runs parallel inference across the 3 base engines, then passes 
        probabilities into Model #4 for unified risk level classification.
        """
        # Engine 1: Kinetic Fall Probability (XGBoost)
        kinetic_df = self._extract_kinetic_features(raw_imu_data)
        kinetic_prob = float(self.kinetic_model.predict_proba(kinetic_df)[0][1])

        # Engine 2: Physiological Anomaly Score (Isolation Forest)
        # Standardize dictionary keys to match trained names: 'heart_rate', 'gsr_raw'
        hr_val = physio_features.get('heart_rate', physio_features.get('hr_bpm', 75.0))
        gsr_val = physio_features.get('gsr_raw', physio_features.get('gsr_us', 3.2))
        
        physio_df = pd.DataFrame([{'heart_rate': hr_val, 'gsr_raw': gsr_val}])
        raw_score = self.physio_model.score_samples(physio_df)[0]
        physio_score = float(np.clip(1.0 - (raw_score + 0.5), 0.0, 1.0))

        # Engine 3: Environmental Hazard Probability (Random Forest)
        expected_n_features = getattr(self.env_model, "n_features_in_", 128)
        
        if isinstance(env_features, dict):
            env_arr = list(env_features.values())
        else:
            env_arr = list(env_features)
            
        if len(env_arr) < expected_n_features:
            env_arr.extend([0.0] * (expected_n_features - len(env_arr)))
        elif len(env_arr) > expected_n_features:
            env_arr = env_arr[:expected_n_features]

        # Use DataFrame if feature names exist on the model, otherwise pass numpy array
        if hasattr(self.env_model, "feature_names_in_"):
            env_df = pd.DataFrame([env_arr], columns=self.env_model.feature_names_in_)
            env_prob = float(self.env_model.predict_proba(env_df)[0][1])
        else:
            env_prob = float(self.env_model.predict_proba([env_arr])[0][1])

        # Engine 4: Unified Risk Fusion Assessment (Gradient Boosting)
        fusion_input = pd.DataFrame([{
            'kinetic_prob': kinetic_prob,
            'physio_score': physio_score,
            'env_prob': env_prob
        }])
        
        risk_level = int(self.fusion_model.predict(fusion_input)[0])
        threat_labels = {0: "NOMINAL", 1: "WARNING", 2: "CRITICAL_CRISIS"}

        return {
            "risk_level": risk_level,
            "threat_status": threat_labels.get(risk_level, "UNKNOWN"),
            "confidence_scores": {
                "kinetic_fall_prob": round(kinetic_prob, 4),
                "physio_anomaly_score": round(physio_score, 4),
                "env_hazard_prob": round(env_prob, 4)
            }
        }

if __name__ == "__main__":
    engine = WorkerSafetyAIEngine()
    
    # Mock test payload
    mock_imu_window = [
        [0.02, 0.01, 0.98, 0.00, 0.01, 0.00],
        [0.05, 0.02, 0.99, 0.01, 0.00, 0.01],
        [0.01, -0.01, 0.97, 0.00, 0.01, 0.00]
    ]
    
    # Passing both format variants to confirm mapping fix
    mock_physio = {'hr_bpm': 75.0, 'gsr_us': 3.2}
    mock_env = [0.0] * 128
    
    result = engine.evaluate_telemetry(mock_imu_window, mock_physio, mock_env)
    print("\nInference Output:")
    print(result)