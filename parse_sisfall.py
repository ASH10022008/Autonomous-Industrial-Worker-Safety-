import os
import glob
import pandas as pd
import numpy as np

def parse_sisfall_folder(sisfall_dir_path):
    print(f"🔍 Scanning SisFall directory: {sisfall_dir_path}")
    
    # Recursively find all txt files inside SisFall subdirectories
    txt_files = glob.glob(os.path.join(sisfall_dir_path, "**", "*.txt"), recursive=True)
    print(f"📦 Found {len(txt_files)} individual trial files.")
    
    combined_rows = []
    
    for file_path in txt_files:
        filename = os.path.basename(file_path)
        
        # Determine activity type from filename prefix (F = Fall, D = Daily Activity)
        is_fall = 1 if "_F" in filename or "F" in filename[:3] else 0
        
        try:
            # SisFall raw text files are comma-delimited without headers
            # Columns 0, 1, 2 correspond to ADXL345 Accelerometer (X, Y, Z raw values)
            df = pd.read_csv(file_path, header=None, sep=',', usecols=[0, 1, 2], on_bad_lines='skip')
            
            # Clean trailing whitespace/semicolons if present
            df[2] = df[2].astype(str).str.replace(';', '').astype(float)
            df[0] = df[0].astype(float)
            df[1] = df[1].astype(float)
            
            # Convert ADXL345 raw values to g-force (Resolution: 13-bit at +-16g -> ~0.0039g/LSB)
            scale_factor = 0.00390625
            df['accel_x'] = df[0] * scale_factor
            df['accel_y'] = df[1] * scale_factor
            df['accel_z'] = df[2] * scale_factor
            df['label'] = is_fall
            
            # Keep clean converted columns
            clean_df = df[['accel_x', 'accel_y', 'accel_z', 'label']]
            combined_rows.append(clean_df)
            
        except Exception as e:
            continue

    if not combined_rows:
        print("❌ Could not read files. Check if the folder path is correct.")
        return

    full_df = pd.concat(combined_rows, ignore_index=True)
    
    # Downsample stream to ~5Hz to align with your ESP32 sampling rate
    # SisFall is natively sampled at 200Hz (take every 40th row)
    downsampled_df = full_df.iloc[::40].reset_index(drop=True)
    
    output_filename = "sisfall_dataset.csv"
    downsampled_df.to_csv(output_filename, index=False)
    print(f"✅ Combined {len(downsampled_df)} samples into '{output_filename}' successfully!")

if __name__ == "__main__":
    # Replace 'SisFall_dataset' with your exact extracted folder name if different
    parse_sisfall_folder('archive')