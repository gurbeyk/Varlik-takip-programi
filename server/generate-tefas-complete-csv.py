#!/usr/bin/env python3
import pandas as pd
from tefas import Crawler
from datetime import datetime

def turkce_fon_listesi_olustur_tam():
    """Generate complete TEFAS fund list with Turkish names"""
    print("TEFAS'tan tüm fonların Türkçe isimleri çekiliyor...")
    
    try:
        tefas = Crawler()
        
        # Get data for a specific recent date to capture all active funds
        # This is more efficient than fetching a range
        tarih = "2024-11-01"
        
        print(f"Fetching funds for {tarih}...")
        veriler = tefas.fetch(
            start=tarih,
            end=tarih,
            columns=["code", "title"]
        )
        
        if veriler is not None and not veriler.empty:
            # Remove duplicates and reset index
            df_temiz = veriler[['code', 'title']].drop_duplicates(subset=['code']).reset_index(drop=True)
            
            # Rename columns
            df_temiz.rename(columns={'code': 'Symbol', 'title': 'Name'}, inplace=True)
            df_temiz['Tur'] = 'TEFAS'
            
            # Save as CSV
            df_temiz.to_csv('tefas_tr_listesi.csv', index=False)
            
            print(f"✓ Başarılı! {len(df_temiz)} adet fon Türkçe isimleriyle kaydedildi.")
            print("\nİlk 10 örnek:")
            print(df_temiz.head(10).to_string(index=False))
            print(f"\nSon 5 örnek:")
            print(df_temiz.tail(5).to_string(index=False))
            
            return True
        else:
            print("✗ Veri alınamadı")
            return False
            
    except Exception as e:
        print(f"✗ Hata oluştu: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    turkce_fon_listesi_olustur_tam()
