import pandas as pd
import numpy as np
import joblib
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

def train_high_accuracy_sisfall():
    print("📂 Loading sisfall_dataset.csv...")
    df = pd.read_csv('sisfall_dataset.csv')
    print(f"📊 Loaded {len(df):,} total rows.")

    acc_x = df['accel_x'].to_numpy()
    acc_y = df['accel_y'].to_numpy()
    acc_z = df['accel_z'].to_numpy()
    labels = df['label'].to_numpy()

    window_size = 10
    step_size = 5  # 50% overlap

    features = []
    target_labels = []

    print("⚡ Computing advanced orientation & kinetic features...")
    num_windows = (len(df) - window_size) // step_size

    for idx in range(num_windows):
        start = idx * step_size
        end = start + window_size

        x_win = acc_x[start:end]
        y_win = acc_y[start:end]
        z_win = acc_z[start:end]

        # 1. Acceleration Magnitude & Jerk
        g_mag = np.sqrt(x_win**2 + y_win**2 + z_win**2)
        jerk = np.diff(g_mag, prepend=g_mag[0])

        # 2. Body Orientation Angles (Pitch & Roll in degrees)
        pitch = np.degrees(np.arctan2(x_win, np.sqrt(y_win**2 + z_win**2)))
        roll = np.degrees(np.arctan2(y_win, np.sqrt(x_win**2 + z_win**2)))

        feat = {
            'max_g': np.max(g_mag),
            'min_g': np.min(g_mag),
            'range_g': np.max(g_mag) - np.min(g_mag),
            'mean_g': np.mean(g_mag),
            'std_g': np.std(g_mag),
            'max_jerk': np.max(np.abs(jerk)),
            'std_jerk': np.std(jerk),
            'pitch_range': np.max(pitch) - np.min(pitch),
            'roll_range': np.max(roll) - np.min(roll),
            'final_pitch': pitch[-1],
            'final_roll': roll[-1],
            'accel_x_max': np.max(np.abs(x_win)),
            'accel_y_max': np.max(np.abs(y_win)),
            'accel_z_max': np.max(np.abs(z_win)),
        }

        win_label = 1 if np.any(labels[start:end] == 1) else 0

        features.append(feat)
        target_labels.append(win_label)

    X = pd.DataFrame(features)
    y = np.array(target_labels)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print("🚀 Fitting Tuned XGBoost Model...")
    model = XGBClassifier(
        n_estimators=250,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=1.3,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    print(f"\n✅ Training Complete! Production Kinetic Accuracy: {acc * 100:.2f}%\n")
    print(classification_report(y_test, y_pred, target_names=['Normal ADL', 'Fall Crisis']))

    joblib.dump(model, 'xgb_crisis_classifier.pkl')
    print("💾 Saved high-accuracy model artifact to 'xgb_crisis_classifier.pkl'")

if __name__ == "__main__":
    train_high_accuracy_sisfall()