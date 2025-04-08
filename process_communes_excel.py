import pandas as pd
import json
import os

# Path to the Excel file
excel_file_path = 'attached_assets/code_wilayas (2).xlsx'

# Read the Excel file
try:
    # Try reading with default parameters
    df = pd.read_excel(excel_file_path)
    print(f"Excel file read successfully. Columns: {df.columns.tolist()}")
    print(f"First few rows: {df.head().to_dict('records')}")
except Exception as e:
    print(f"Error reading Excel file with default parameters: {e}")
    try:
        # Try with explicit engine
        df = pd.read_excel(excel_file_path, engine='openpyxl')
        print(f"Excel file read successfully with openpyxl engine. Columns: {df.columns.tolist()}")
        print(f"First few rows: {df.head().to_dict('records')}")
    except Exception as e:
        print(f"Error reading Excel file with openpyxl engine: {e}")
        # If still failing, try listing sheets
        try:
            xls = pd.ExcelFile(excel_file_path, engine='openpyxl')
            print(f"Available sheets: {xls.sheet_names}")
            # Try reading the first sheet
            if xls.sheet_names:
                df = pd.read_excel(excel_file_path, sheet_name=xls.sheet_names[0], engine='openpyxl')
                print(f"Read first sheet successfully. Columns: {df.columns.tolist()}")
                print(f"First few rows: {df.head().to_dict('records')}")
        except Exception as e:
            print(f"Error listing sheets: {e}")
            exit(1)

# Print out general information about the file
print(f"\nFile information:")
print(f"Total rows: {len(df)}")
print(f"Memory usage: {df.memory_usage(deep=True).sum() / 1024:.2f} KB")

# Save the data to a JSON file for easier viewing
output_path = 'commune_data.json'
try:
    df.to_json(output_path, orient='records')
    print(f"\nSaved data to {output_path}")
except Exception as e:
    print(f"Error saving to JSON: {e}")