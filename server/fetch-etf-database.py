#!/usr/bin/env python3
import pandas as pd
import requests
import io
import sys

def etf_veritabani_olustur():
    try:
        print("ETF listesi indiriliyor, lütfen bekleyin...")
        
        # NASDAQ ve NYSE'deki ETF'lerin tutulduğu güncel bir GitHub veri kaynağı
        url = "https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/etf/etf_list.csv"
        
        s = requests.get(url, timeout=10).content
        df = pd.read_csv(io.StringIO(s.decode('utf-8')))
        
        # Bize sadece Sembol ve İsim lazım
        df = df[['Symbol', 'Name']]
        
        # Dosyayı CSV olarak kaydedelim
        df.to_csv('etf_listesi.csv', index=False)
        
        print(f"Başarılı! Toplam {len(df)} adet ETF veritabanına kaydedildi.")
        print("Dosya adı: etf_listesi.csv")
        
    except Exception as e:
        print(f"Hata oluştu: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    etf_veritabani_olustur()
