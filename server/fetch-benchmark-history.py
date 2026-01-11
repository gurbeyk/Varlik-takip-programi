#!/usr/bin/env python3
import sys
import json
import yfinance as yf
from datetime import datetime, timedelta

def fetch_history(symbol, date_str):
    """
    Fetch historical close price for a symbol on or after a specific date.
    """
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
        # Fetch a range starting from target_date to +5 days to handle weekends/holidays
        start_date = target_date.strftime("%Y-%m-%d")
        end_date = (target_date + timedelta(days=5)).strftime("%Y-%m-%d")

        # yfinance download
        # period='1mo' is fallback, but start/end is precise
        import os
        import contextlib
        
        with open(os.devnull, 'w') as devnull:
             with contextlib.redirect_stdout(devnull), contextlib.redirect_stderr(devnull):
                 data = yf.download(symbol, start=start_date, end=end_date, progress=False, multi_level_index=False)
        
        if not data.empty:
            # Get first available 'Close' price
            # iloc[0] gives the first row (closest to start_date)
            price = data.iloc[0]['Close']
            return float(price)
        return None
    except Exception as e:
        return None

if __name__ == "__main__":
    if len(sys.argv) > 2:
        symbol = sys.argv[1]
        date_str = sys.argv[2] # YYYY-MM-DD
        
        price = fetch_history(symbol, date_str)
        
        if price is not None:
            print(json.dumps({"price": price}))
        else:
            print(json.dumps({"error": "Price not found"}))
    else:
        print(json.dumps({"error": "Usage: script.py <SYMBOL> <YYYY-MM-DD>"}))
