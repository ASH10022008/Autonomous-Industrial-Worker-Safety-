import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix

def train_and_evaluate_isolation_forest():
    print("📂 Loading biometrics_dataset.csv...")
    df = pd.read_csv('biometrics_dataset.csv')
    
    X = df[['heart_rate', 'gsr_raw']]
    y_true = df['label'].values  # 0: Normal, 1: Anomaly
    
    print("🚀 Training Model #2 (Isolation Forest Anomaly Detector)...")
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.09,
        random_state=42
    )
    iso_forest.fit(X)
    
    # Isolation Forest outputs: 1 for inliers (normal), -1 for outliers (anomalies)
    preds = iso_forest.predict(X)
    y_pred = np.where(preds == -1, 1, 0)
    
    # Calculate Anomaly Decision Scores for ROC-AUC
    scores = -iso_forest.score_samples(X)
    auc = roc_auc_score(y_true, scores)
    
    print(f"\n✅ Training Complete!")
    print(f"📊 Anomaly Separation Power (ROC-AUC Score): {auc * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(y_true, y_pred, target_names=['Normal Baseline', 'Biometric Distress']))
    
    print("Confusion Matrix:")
    cm = confusion_matrix(y_true, y_pred)
    print(f"  True Normal: {cm[0][0]:<6} | False Alarm: {cm[0][1]}")
    print(f"  Missed Stress: {cm[1][0]:<4} | Caught Distress: {cm[1][1]}\n")
    
    joblib.dump(iso_forest, 'iso_forest_biometrics.pkl')
    print("💾 Saved Model #2 artifact as 'iso_forest_biometrics.pkl'")

if __name__ == "__main__":
    train_and_evaluate_isolation_forest()