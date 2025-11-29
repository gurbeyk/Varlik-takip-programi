#!/usr/bin/env python3
import pandas as pd
import json
import sys

# CSV dosyasını yükle
try:
    piyasa_db = pd.read_csv('tum_piyasa_listesi.csv')
    piyasa_db.set_index('Symbol', inplace=True)
except:
    piyasa_db = pd.DataFrame()

def asset_ismi_bul(kullanici_kodu):
    kodu = kullanici_kodu.upper()
    
    if kodu in piyasa_db.index:
        name = piyasa_db.loc[kodu]['Name']
        if isinstance(name, pd.Series):
            name = name.iloc[0]
        return str(name)
    else:
        # Fallback: yfinance kullan
        return yfinance_ile_isim_getir(kodu)

def yfinance_ile_isim_getir(kodu):
    try:
        import yfinance as yf
        ticker = yf.Ticker(kodu)
        return ticker.info.get('longName', 'İsim Bulunamadı')
    except:
        return "Bilinmeyen Kod"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Symbol gerekli"}))
        sys.exit(1)
    
    symbol = sys.argv[1]
    name = asset_ismi_bul(symbol)
    print(json.dumps({"name": name}))
