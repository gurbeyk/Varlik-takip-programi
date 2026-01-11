#!/usr/bin/env python3
import sys
import json
from tefas import Crawler
from datetime import datetime, timedelta
import pandas as pd

def fetch_befas_funds():
    """Fetch all BEFAS funds and save to file using tefas library with kind='EMK'"""
    try:
        # Monkeypatch Crawler to use Turkish site
        Crawler.root_url = "https://www.tefas.gov.tr"
        Crawler.headers["Origin"] = "https://www.tefas.gov.tr"
        Crawler.headers["Referer"] = "https://www.tefas.gov.tr/TarihselVeriler.aspx"
        
        tefas = Crawler()
        
        # Get today's date and a week ago to ensure we get a valid data point
        bugun = datetime.now().strftime("%Y-%m-%d")
        gecmis = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        
        # Fetch BEFAS (Pension Funds) explicitly using kind='EMK'
        veriler = tefas.fetch(
            start=gecmis, 
            end=bugun, 
            columns=["code", "title"],
            kind="EMK"
        )
        
        if veriler.empty:
            return {"error": "No data returned"}
            
        # Group by code and take the latest entry for each
        unique_funds = veriler.groupby('code').last().reset_index()
        
        funds_list = []
        for _, row in unique_funds.iterrows():
            funds_list.append({
                "code": row['code'],
                "name": row['title']
            })
        
        # Sort by code
        funds_list.sort(key=lambda x: x['code'])
        return funds_list

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    result = fetch_befas_funds()
    
    # Save to file
    with open('server/befas_funds.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(json.dumps({"count": len(result) if isinstance(result, list) else 0}))
