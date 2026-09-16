import numpy as np
import pandas as pd

def extract_window_features(window_df):
    """
    Extracts orientation and kinetic metrics from a 2-second window DataFrame.
    Matches the exact feature schema used by xgb_crisis_classifier.pkl.
    """
    x_win = window_df['accel_x'].to_numpy()
    y_win = window_df['accel_y'].to_numpy()
    z_win = window_df['accel_z'].to_numpy()

    # 1. Acceleration Magnitude & Jerk
    g_mag = np.sqrt(x_win**2 + y_win**2 + z_win**2)
    jerk = np.diff(g_mag, prepend=g_mag[0])

    # 2. Body Orientation Angles (Pitch & Roll in degrees)
    pitch = np.degrees(np.arctan2(x_win, np.sqrt(y_win**2 + z_win**2)))
    roll = np.degrees(np.arctan2(y_win, np.sqrt(x_win**2 + z_win**2)))

    return {
        'max_g': float(np.max(g_mag)),
        'min_g': float(np.min(g_mag)),
        'range_g': float(np.max(g_mag) - np.min(g_mag)),
        'mean_g': float(np.mean(g_mag)),
        'std_g': float(np.std(g_mag)),
        'max_jerk': float(np.max(np.abs(jerk))),
        'std_jerk': float(np.std(jerk)),
        'pitch_range': float(np.max(pitch) - np.min(pitch)),
        'roll_range': float(np.max(roll) - np.min(roll)),
        'final_pitch': float(pitch[-1]),
        'final_roll': float(roll[-1]),
        'accel_x_max': float(np.max(np.abs(x_win))),
        'accel_y_max': float(np.max(np.abs(y_win))),
        'accel_z_max': float(np.max(np.abs(z_win))),
    }