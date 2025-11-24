import pandas as pd
import matplotlib.pyplot as plt
import sys

if len(sys.argv) < 2:
    print("Usage: python plot.py <filename.csv>")
    sys.exit(1)

filename = sys.argv[1]

try:
    # Read the CSV
    df = pd.read_csv(filename)

    plt.figure(figsize=(12, 6))

    # Plot Instant Throughput (Blue line)
    plt.plot(df['Elapsed_Seconds'], df['Instant_TPS'], label='Instant Throughput (msg/s)', color='#007acc', alpha=0.7)
    
    # Plot Average Throughput (Red Dashed line)
    plt.plot(df['Elapsed_Seconds'], df['Average_TPS'], label='Average Throughput', color='#d62728', linestyle='--')

    plt.title(f'Cassandra Stress Test Performance\nSource: {filename}')
    plt.xlabel('Time (Seconds)')
    plt.ylabel('Messages Per Second (TPS)')
    plt.legend()
    plt.grid(True, which='both', linestyle='--', linewidth=0.5)
    
    # Save chart
    output_file = filename.replace('.csv', '.png')
    plt.savefig(output_file)
    print(f"✅ Chart saved to: {output_file}")
    plt.show()

except Exception as e:
    print(f"Error: {e}")
    print("Make sure you installed libraries: pip install pandas matplotlib")