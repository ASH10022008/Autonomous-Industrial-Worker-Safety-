import joblib
import pandas as pd
import numpy as np
from features import extract_window_features

class SafetyAIEngine:
    def __init__(self, xgb_path='xgb_crisis_classifier.pkl', iso_path='iso_forest_biometrics.pkl'):
        # Load trained binaries
        print("⚙️ Initializing Safety AI Engine...")
        self.xgb_model = joblib.load(xgb_path)
        self.iso_model = joblib.load(iso_path)
        print("✅ Models #1 (XGBoost) and #2 (Isolation Forest) loaded successfully.")

    def evaluate_sensor_window(self, window_df):
        """
        Evaluates a 2-second telemetry window (10 samples @ 5Hz).
        window_df must contain: accel_x, accel_y, accel_z, heart_rate, gsr_raw
        """
        # 1. Kinetic Feature Extraction
        kinetic_features_dict = extract_window_features(window_df)
        kinetic_df = pd.DataFrame([kinetic_features_dict])

        # 2. Model #1 Execution: Physical Fall / Impact (XGBoost)
        is_fall = bool(self.xgb_model.predict(kinetic_df)[0])

        # 3. Model #2 Execution: Physiological Distress (Isolation Forest)
        latest_hr = float(window_df['heart_rate'].iloc[-1]) if 'heart_rate' in window_df.columns else 75.0
        latest_gsr = float(window_df['gsr_raw'].iloc[-1]) if 'gsr_raw' in window_df.columns else 1200.0
        
        bio_df = pd.DataFrame([{'heart_rate': latest_hr, 'gsr_raw': latest_gsr}])
        
        # Isolation Forest outputs -1 for anomalous/distress states
        is_biometric_distress = bool(self.iso_model.predict(bio_df)[0] == -1)

        # 4. Multi-Modal Risk Matrix Synthesis
        if is_fall and is_biometric_distress:
            status = "CRITICAL_FALL_WITH_DISTRESS"
            severity = "CRITICAL"
            risk_score = 0.98
        elif is_fall:
            status = "IMPACT_DETECTED"
            severity = "HIGH"
            risk_score = 0.75
        elif is_biometric_distress:
            status = "PHYSIOLOGICAL_STRESS_WARNING"
            severity = "MEDIUM"
            risk_score = 0.50
        else:
            status = "NORMAL"
            severity = "LOW"
            risk_score = 0.05

        return {
            "status": status,
            "severity": severity,
            "risk_score": risk_score,
            "flags": {
                "kinetic_fall": is_fall,
                "biometric_distress": is_biometric_distress
            },
            "metrics": {
                "max_g": round(kinetic_features_dict['max_g'], 2),
                "heart_rate": round(latest_hr, 1),
                "gsr_raw": round(latest_gsr, 1)
            }
        }

if __name__ == "__main__":
    # Test execution
    engine = SafetyAIEngine()

    # Test Case: Normal Activity
    normal_df = pd.DataFrame({
        'accel_x': [0.05] * 10,
        'accel_y': [-0.98] * 10,
        'accel_z': [0.10] * 10,
        'heart_rate': [76.0] * 10,
        'gsr_raw': [1150.0] * 10
    })

    # Test Case: Fall + Heat Stress Spike
    crisis_df = pd.DataFrame({
        'accel_x': [2.85] * 10,
        'accel_y': [-4.20] * 10,
        'accel_z': [1.10] * 10,
        'heart_rate': [142.0] * 10,
        'gsr_raw': [2400.0] * 10
    })

    print("\n🧪 Normal Window Result:", engine.evaluate_sensor_window(normal_df))
    print("\n🚨 Crisis Window Result:", engine.evaluate_sensor_window(crisis_df))