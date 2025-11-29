#!/usr/bin/env python3
import pandas as pd
import json
import sys
import yfinance as yf

# CSV dosyasını yükle (optional)
piyasa_db = pd.DataFrame()
try:
    piyasa_db = pd.read_csv('tum_piyasa_listesi.csv')
    piyasa_db.set_index('Symbol', inplace=True)
except:
    pass

def asset_ismi_bul(kullanici_kodu):
    kodu = kullanici_kodu.upper()
    
    # Önce CSV'de ara
    if not piyasa_db.empty and kodu in piyasa_db.index:
        name = piyasa_db.loc[kodu]['Name']
        if isinstance(name, pd.Series):
            name = name.iloc[0]
        return str(name)
    
    # CSV'de yoksa yfinance'ten çek
    return yfinance_ile_isim_getir(kodu)

def yfinance_ile_isim_getir(kodu):
    try:
        ticker = yf.Ticker(kodu)
        long_name = ticker.info.get('longName')
        short_name = ticker.info.get('shortName')
        
        if long_name:
            return long_name
        elif short_name:
            return short_name
        else:
            return "İsim Bulunamadı"
    except:
        return "Bilinmeyen Kod"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Symbol gerekli"}))
        sys.exit(1)
    
    symbol = sys.argv[1]
    name = asset_ismi_bul(symbol)
    print(json.dumps({"name": name}))
