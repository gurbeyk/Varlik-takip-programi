#!/usr/bin/env python3
import sys
import json
import yfinance as yf

def fiyat_getir(hisse_kodu):
    """Fetch US stock or ETF price from Yahoo Finance"""
    try:
        ticker = yf.Ticker(hisse_kodu)
        # Get last price from fast_info
        fiyat = ticker.fast_info['last_price']
        return round(fiyat, 2)
    except Exception as e:
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
        fiyat = fiyat_getir(symbol)
        if fiyat is not None:
            print(json.dumps({"price": fiyat}))
        else:
            print(json.dumps({"error": f"Could not fetch price for {symbol}"}))
    else:
        print(json.dumps({"error": "No symbol provided"}))
