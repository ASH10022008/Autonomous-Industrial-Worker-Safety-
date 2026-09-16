import pandas as pd
import numpy as np

def generate_local_biometrics():
    print("⚡ Generating local biometrics_dataset.csv baseline...")
    np.random.seed(42)
    
    # Normal working state (7,000 samples: HR 65-90 BPM, GSR 900-1400)
    n_normal = 7000
    hr_normal = np.random.normal(76.0, 6.5, n_normal)
    gsr_normal = np.random.normal(1180.0, 110.0, n_normal)
    
    # Physiological stress / exhaustion anomalies (700 samples: HR 115-160 BPM, GSR 1800-3000)
    n_anomaly = 700
    hr_anomaly = np.random.uniform(115.0, 160.0, n_anomaly)
    gsr_anomaly = np.random.uniform(1800.0, 3000.0, n_anomaly)
    
    df_normal = pd.DataFrame({'heart_rate': hr_normal, 'gsr_raw': gsr_normal, 'label': 0})
    df_anomaly = pd.DataFrame({'heart_rate': hr_anomaly, 'gsr_raw': gsr_anomaly, 'label': 1})
    
    full_df = pd.concat([df_normal, df_anomaly]).sample(frac=1.0, random_state=42).reset_index(drop=True)
    full_df.to_csv('biometrics_dataset.csv', index=False)
    
    print("✅ Successfully generated 'biometrics_dataset.csv' (7,700 rows)")

if __name__ == "__main__":
    generate_local_biometrics()