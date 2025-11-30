#!/usr/bin/env python3
import pandas as pd
from tefas import Crawler
from datetime import datetime, timedelta

def turkce_fon_listesi_olustur():
    """Generate complete TEFAS fund list with Turkish names"""
    print("TEFAS'tan tüm fonların Türkçe isimleri çekiliyor...")
    
    try:
        tefas = Crawler()
        
        # Bugünün tarihini kullan - en güncel verileri alır
        bugun = datetime.now().strftime("%Y-%m-%d")
        
        print(f"Tarih: {bugun} için veri çekiliyor...")
        veriler = tefas.fetch(
            start=bugun,
            end=bugun,
            columns=["code", "title"]
        )
        
        if veriler is not None and not veriler.empty:
            # Duplikatları temizle
            df_temiz = veriler[['code', 'title']].drop_duplicates(subset=['code']).reset_index(drop=True)
            
            # Sütun isimlerini değiştir
            df_temiz.rename(columns={'code': 'Symbol', 'title': 'Name'}, inplace=True)
            df_temiz['Tur'] = 'TEFAS'
            
            # CSV olarak kaydet
            df_temiz.to_csv('tefas_tr_listesi.csv', index=False)
            
            print(f"✓ Başarılı! {len(df_temiz)} adet fon kaydedildi.")
            print("\nİlk 5 örnek:")
            print(df_temiz.head(5).to_string(index=False))
            print("\nAFA ve AFT kontrol:")
            afa = df_temiz[df_temiz['Symbol'] == 'AFA']
            aft = df_temiz[df_temiz['Symbol'] == 'AFT']
            mac = df_temiz[df_temiz['Symbol'] == 'MAC']
            if not afa.empty:
                print(f"AFA: {afa.iloc[0]['Name']}")
            if not aft.empty:
                print(f"AFT: {aft.iloc[0]['Name']}")
            if not mac.empty:
                print(f"MAC: {mac.iloc[0]['Name']}")
        else:
            print("✗ Veri alınamadı - alternatif tarih denenecek")
            # Eğer bugün veri yoksa dün dene
            dun = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            print(f"Tarih: {dun} için veri çekiliyor...")
            veriler = tefas.fetch(
                start=dun,
                end=dun,
                columns=["code", "title"]
            )
            
            if veriler is not None and not veriler.empty:
                df_temiz = veriler[['code', 'title']].drop_duplicates(subset=['code']).reset_index(drop=True)
                df_temiz.rename(columns={'code': 'Symbol', 'title': 'Name'}, inplace=True)
                df_temiz['Tur'] = 'TEFAS'
                df_temiz.to_csv('tefas_tr_listesi.csv', index=False)
                print(f"✓ Başarılı! {len(df_temiz)} adet fon kaydedildi.")
            
    except Exception as e:
        print(f"✗ Hata oluştu: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    turkce_fon_listesi_olustur()
