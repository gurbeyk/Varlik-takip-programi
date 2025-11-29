#!/usr/bin/env python3
import yfinance as yf
import json
import sys

def get_usd_try_rate():
    try:
        # Yahoo Finance'de Dolar/TL kodu: TRY=X
        kur = yf.Ticker("TRY=X")
        guncel_fiyat = kur.fast_info['last_price']
        return round(guncel_fiyat, 4)
    except Exception as e:
        print(f"Hata: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    rate = get_usd_try_rate()
    if rate is not None:
        print(json.dumps({"rate": rate}))
    else:
        print(json.dumps({"error": "Could not fetch currency rate"}))
