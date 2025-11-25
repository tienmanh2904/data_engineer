import pandas as pd
import matplotlib.pyplot as plt
import sys
import glob

# How to use: python plot_combined.py file1.csv file2.csv
# OR: python plot_combined.py *.csv

if len(sys.argv) < 2:
    # If no files provided, try to find all csvs in folder
    files = glob.glob("benchmark-results-*.csv")
    if not files:
        print("Usage: python plot_combined.py file1.csv file2.csv ...")
        sys.exit(1)
else:
    files = sys.argv[1:]

print(f"📈 Combining data from {len(files)} files...")

plt.figure(figsize=(12, 6))

# We will create a master dataframe to sum up throughput per second
all_data = []

for i, filename in enumerate(files):
    try:
        df = pd.read_csv(filename)
        
        # Round elapsed time to nearest second to align data from different laptops
        df['Time_Bin'] = df['Elapsed_Seconds'].round().astype(int)
        
        # Select relevant columns and add to list
        clean_df = df[['Time_Bin', 'Instant_TPS']].copy()
        clean_df.columns = ['Time_Bin', f'TPS_Laptop_{i+1}']
        all_data.append(clean_df)
        
        # Optional: Plot individual lines faintly
        plt.plot(df['Elapsed_Seconds'], df['Instant_TPS'], alpha=0.3, linestyle='--', label=f'Laptop {i+1}')
        
    except Exception as e:
        print(f"Skipping {filename}: {e}")

# Merge all dataframes on Time_Bin
if all_data:
    # Merge logic
    combined_df = all_data[0]
    for i in range(1, len(all_data)):
        combined_df = pd.merge(combined_df, all_data[i], on='Time_Bin', how='outer').fillna(0)
    
    # Sum up all TPS columns to get Total Throughput
    tps_cols = [c for c in combined_df.columns if 'TPS_Laptop' in c]
    combined_df['Total_TPS'] = combined_df[tps_cols].sum(axis=1)
    combined_df = combined_df.sort_values('Time_Bin')

    # Plot the Thick Master Line
    plt.plot(combined_df['Time_Bin'], combined_df['Total_TPS'], 
             label='TOTAL CLUSTER THROUGHPUT', color='#d62728', linewidth=2.5)

    plt.title(f'Distributed Stress Test (Combined Load)')
    plt.xlabel('Time (Seconds)')
    plt.ylabel('Messages Per Second (TPS)')
    plt.legend()
    plt.grid(True, which='both', linestyle='--', linewidth=0.5)

    output_file = 'combined_results.png'
    plt.savefig(output_file)
    print(f"✅ Combined chart saved to: {output_file}")
    plt.show()
else:
    print("No valid data found.")