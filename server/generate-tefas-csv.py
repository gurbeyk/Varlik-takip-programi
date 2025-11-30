#!/usr/bin/env python3
import pandas as pd
from tefas import Crawler
from datetime import datetime, timedelta

def turkce_fon_listesi_olustur():
    print("TEFAS'tan Türkçe fon isimleri çekiliyor...")
    
    try:
        tefas = Crawler()
        
        # Get data from the last 30 days to capture all active funds
        bugun = datetime.now().strftime("%Y-%m-%d")
        gecmis = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        # Fetch all fund data
        veriler = tefas.fetch(
            start=gecmis,
            end=bugun,
            columns=["code", "title"]
        )
        
        if veriler is not None and not veriler.empty:
            # Remove duplicates and keep only code and title
            df_temiz = veriler[['code', 'title']].drop_duplicates(subset=['code']).reset_index(drop=True)
            
            # Rename columns to match our schema
            df_temiz.rename(columns={'code': 'Symbol', 'title': 'Name'}, inplace=True)
            df_temiz['Tur'] = 'TEFAS'
            
            # Save as CSV
            df_temiz.to_csv('tefas_tr_listesi.csv', index=False)
            
            print(f"Başarılı! {len(df_temiz)} adet fon Türkçe isimleriyle kaydedildi.")
            print("\nÖrnekler:")
            print(df_temiz.head(10).to_string())
        else:
            print("Veri alınamadı")
            
    except Exception as e:
        print(f"Hata oluştu: {e}")

if __name__ == "__main__":
    turkce_fon_listesi_olustur()
