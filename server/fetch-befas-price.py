#!/usr/bin/env python3
import sys
import json
from datetime import datetime, timedelta
from tefas import Crawler

def fon_fiyati_getir(fon_kodu):
    """Fetch BEFAS fund price from TEFAS"""
    fon_kodu = fon_kodu.upper()
    
    try:
        # Monkeypatch Crawler to use Turkish site
        Crawler.root_url = "https://www.tefas.gov.tr"
        Crawler.headers["Origin"] = "https://www.tefas.gov.tr"
        Crawler.headers["Referer"] = "https://www.tefas.gov.tr/TarihselVeriler.aspx"
        
        tefas = Crawler()
        
        # Get today's date and a week ago (BEFAS update times can vary)
        bugun = datetime.now().strftime("%Y-%m-%d")
        gecmis = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        
        # Fetch data from TEFAS
        # Important: Use kind='EMK' for pension funds
        veriler = tefas.fetch(
            start=gecmis, 
            end=bugun, 
            name=fon_kodu, 
            columns=["code", "date", "price", "title"],
            kind="EMK"
        )
        
        if not veriler.empty:
            # Sort by date and get the latest
            son_veri = veriler.sort_values(by="date").iloc[-1]
            
            fiyat = float(son_veri['price'])
            return round(fiyat, 6)
        else:
            return None
            
    except Exception as e:
        # Debugging: print error to stderr
        print(f"Error fetching price: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
        fiyat = fon_fiyati_getir(symbol)
        if fiyat is not None:
            print(json.dumps({"price": fiyat}))
        else:
            print(json.dumps({"error": f"Could not fetch price for {symbol}"}))
    else:
        print(json.dumps({"error": "No symbol provided"}))
