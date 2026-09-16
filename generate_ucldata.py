import os
import joblib
import pandas as pd
from sklearn.datasets import load_svmlight_file
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

EXTRACT_DIR = "uci_gas_data"

def get_batch_path(batch_num):
    for root, dirs, files in os.walk(EXTRACT_DIR):
        if f"batch{batch_num}.dat" in files:
            return os.path.join(root, f"batch{batch_num}.dat")
    return None

# 1. Train strictly on Batch 1 (Time Period 1)
path_b1 = get_batch_path(1)
X_sparse_b1, y_b1 = load_svmlight_file(path_b1)
X_train = pd.DataFrame(X_sparse_b1.toarray())
y_train = pd.Series(y_b1).isin([3.0, 6.0]).astype(int)

print(f"Training on Batch 1 ({len(X_train)} samples)...")
model_env = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
model_env.fit(X_train, y_train)

# 2. Test strictly on Batch 2 (Later Time Period - Real Drift Test)
path_b2 = get_batch_path(2)
X_sparse_b2, y_b2 = load_svmlight_file(path_b2)
X_test = pd.DataFrame(X_sparse_b2.toarray())
y_test = pd.Series(y_b2).isin([3.0, 6.0]).astype(int)

# Align feature column count if needed
X_test = X_test.reindex(columns=X_train.columns, fill_value=0)

print(f"Testing on Batch 2 ({len(X_test)} unseen temporal samples)...")
y_pred = model_env.predict(X_test)

print("\n--- Out-of-Sample Drift Evaluation ---")
print(classification_report(y_test, y_pred))

# Save leak-free model
joblib.dump(model_env, 'env_hazard_rf.pkl')
print("Model saved to env_hazard_rf.pkl")