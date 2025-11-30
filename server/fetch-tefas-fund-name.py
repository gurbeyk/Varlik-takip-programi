#!/usr/bin/env python3
import sys
import json
import pandas as pd
import os

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(script_dir, 'tefas_tr_listesi.csv')

def fon_ismi_bul(kod):
    """Look up Turkish fund name from CSV"""
    kod = kod.upper()
    
    try:
        # Load the CSV with Symbol as index for faster lookup
        fon_db = pd.read_csv(csv_path, index_col='Symbol')
        
        if kod in fon_db.index:
            return fon_db.loc[kod]['Name']
        else:
            return None
    except:
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
        name = fon_ismi_bul(symbol)
        
        if name:
            print(json.dumps({"name": name}))
        else:
            print(json.dumps({"error": f"Could not find Turkish name for {symbol}"}))
    else:
        print(json.dumps({"error": "No symbol provided"}))
