#!/usr/bin/env python3
import sys
import json
from datetime import datetime, timedelta
from tefas import Crawler

def fon_adi_getir(fon_kodu):
    """Fetch TEFAS fund name and details"""
    fon_kodu = fon_kodu.upper()
    
    try:
        tefas = Crawler()
        
        # Get today's date and 3 days ago (to handle weekends)
        bugun = datetime.now().strftime("%Y-%m-%d")
        gecmis = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
        
        # Fetch data from TEFAS
        veriler = tefas.fetch(
            start=gecmis, 
            end=bugun, 
            name=fon_kodu, 
            columns=["code", "date", "price", "title"]
        )
        
        if not veriler.empty:
            # Get the latest entry
            son_veri = veriler.sort_values(by="date").iloc[-1]
            
            return {
                "kod": str(son_veri['code']),
                "ad": str(son_veri['title']),
                "fiyat": float(son_veri['price'])
            }
        else:
            return None
            
    except Exception as e:
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
        result = fon_adi_getir(symbol)
        if result:
            print(json.dumps({"name": result["ad"], "price": result["fiyat"]}))
        else:
            print(json.dumps({"error": f"Could not fetch fund name for {symbol}"}))
    else:
        print(json.dumps({"error": "No symbol provided"}))
