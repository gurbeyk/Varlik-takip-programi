#!/usr/bin/env python3
import pandas as pd
import json
import sys

# CSV dosyasını program başlarken bir kere yükle (Performans için)
try:
    etf_db = pd.read_csv('etf_listesi.csv')
    # Aramayı hızlandırmak için sembolleri indeks yapalım
    etf_db.set_index('Symbol', inplace=True)
except:
    etf_db = pd.DataFrame()

def etf_ismi_bul(kullanici_kodu):
    kodu = kullanici_kodu.upper()
    
    if kodu in etf_db.index:
        name = etf_db.loc[kodu]['Name']
        # Eğer list ise ilkini al
        if isinstance(name, pd.Series):
            name = name.iloc[0]
        return str(name)
    else:
        # Listede yoksa yfinance'a soralım (Yedek Plan)
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
    name = etf_ismi_bul(symbol)
    print(json.dumps({"name": name}))
