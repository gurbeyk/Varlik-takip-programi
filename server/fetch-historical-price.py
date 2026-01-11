#!/usr/bin/env python3
import sys
import json
from datetime import datetime, timedelta
from tefas import Crawler

def fetch_historical_price(code, date_str):
    """Fetch fund price for a specific date"""
    code = code.upper()
    try:
        # Monkeypatch Crawler to use Turkish site (TEFAS)
        Crawler.root_url = "https://www.tefas.gov.tr"
        Crawler.headers["Origin"] = "https://www.tefas.gov.tr"
        Crawler.headers["Referer"] = "https://www.tefas.gov.tr/TarihselVeriler.aspx"
        
        tefas = Crawler()
        
        # Parse input date (YYYY-MM-DD -> datetime)
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
        
        # Fetch data for a small range around the target date to ensure we get data
        # Sometimes exact date might fall on a weekend/holiday, 
        # but user asked for "that day's price". 
        # If we return previous closing, it's safer.
        # But let's try to fetch exact date first.
        # TEFAS allows fetching a range.
        
        start_date = (target_date - timedelta(days=0)).strftime("%Y-%m-%d")
        end_date = target_date.strftime("%Y-%m-%d")
        
        # Try as Mutual Fund first (YAT)
        # Note: We don't know if it's BEFAS or TEFAS from just code easily here 
        # without querying both or checking list.
        # We can try 'YAT' first, if empty, try 'EMK'.
        
        # Try Mutual Fund (YAT)
        data = tefas.fetch(start=start_date, end=end_date, name=code, columns=["code", "date", "price"], kind="YAT")
        
        if data.empty:
            # Try Pension Fund (EMK)
            data = tefas.fetch(start=start_date, end=end_date, name=code, columns=["code", "date", "price"], kind="EMK")
            
        if not data.empty:
            # Get the price for the specific date if available
            price = float(data.iloc[0]['price'])
            return price
        else:
            return None

    except Exception as e:
        return None

if __name__ == "__main__":
    if len(sys.argv) > 2:
        code = sys.argv[1]
        date_str = sys.argv[2]
        price = fetch_historical_price(code, date_str)
        
        if price is not None:
            print(json.dumps({"price": price}))
        else:
            print(json.dumps({"error": "Price not found"}))
    else:
        print(json.dumps({"error": "Usage: script.py <code> <YYYY-MM-DD>"}))
