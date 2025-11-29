#!/usr/bin/env python3
import pandas as pd
import requests
import io

def tum_piyasayi_guncelle():
    print("Veriler çekiliyor, lütfen bekleyin...")
    
    combined_data = []
    
    try:
        # 1. Hisse senetlerini indir
        print("- Hisseler indiriliyor...")
        url_stocks = "https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/stock/stock_list.csv"
        try:
            s_stock = requests.get(url_stocks, timeout=10).content
            df_stocks = pd.read_csv(io.StringIO(s_stock.decode('utf-8')))
            # Column ismini dinamik olarak bul
            symbol_col = next((c for c in df_stocks.columns if 'symbol' in c.lower()), 'Symbol')
            name_col = next((c for c in df_stocks.columns if 'name' in c.lower()), 'Name')
            
            if symbol_col in df_stocks.columns and name_col in df_stocks.columns:
                df_stocks = df_stocks[[symbol_col, name_col]].copy()
                df_stocks.columns = ['Symbol', 'Name']
                df_stocks['Tur'] = 'Hisse'
                combined_data.append(df_stocks)
                print(f"  {len(df_stocks)} hisse yüklendi")
        except Exception as e:
            print(f"  Hisseler yüklenemedi: {e}")
        
        # 2. ETF'leri indir
        print("- ETF'ler indiriliyor...")
        url_etfs = "https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/etf/etf_list.csv"
        try:
            s_etf = requests.get(url_etfs, timeout=10).content
            df_etfs = pd.read_csv(io.StringIO(s_etf.decode('utf-8')))
            # Column ismini dinamik olarak bul
            symbol_col = next((c for c in df_etfs.columns if 'symbol' in c.lower()), 'Symbol')
            name_col = next((c for c in df_etfs.columns if 'name' in c.lower()), 'Name')
            
            if symbol_col in df_etfs.columns and name_col in df_etfs.columns:
                df_etfs = df_etfs[[symbol_col, name_col]].copy()
                df_etfs.columns = ['Symbol', 'Name']
                df_etfs['Tur'] = 'ETF'
                combined_data.append(df_etfs)
                print(f"  {len(df_etfs)} ETF yüklendi")
        except Exception as e:
            print(f"  ETF'ler yüklenemedi: {e}")
        
        # 3. Birleştir ve kaydet
        if combined_data:
            master_df = pd.concat(combined_data, ignore_index=True)
            master_df.drop_duplicates(subset=['Symbol'], keep='first', inplace=True)
            master_df.to_csv('tum_piyasa_listesi.csv', index=False)
            print(f"\nTAMAM! Toplam {len(master_df)} varlık kaydedildi.")
        else:
            print("\nHiçbir veri yüklenemedi!")
            
    except Exception as e:
        print(f"Genel hata: {e}")

if __name__ == "__main__":
    tum_piyasayi_guncelle()
