#!/usr/bin/env python3
import sys
import json
import requests

# Mapping from crypto symbols to CoinGecko IDs
CRYPTO_ID_MAP = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "BNB": "binancecoin",
    "XRP": "ripple",
    "ADA": "cardano",
    "DOGE": "dogecoin",
    "SOL": "solana",
    "MATIC": "matic-network",
    "LTC": "litecoin",
    "XLM": "stellar",
    "LINK": "chainlink",
    "DOT": "polkadot",
    "AVAX": "avalanche-2",
    "UNI": "uniswap",
    "ATOM": "cosmos",
    "XMR": "monero",
    "XEM": "nem",
    "ZEC": "zcash",
    "DASH": "dash",
    "ETC": "ethereum-classic",
    "BCH": "bitcoin-cash",
    "BSV": "bitcoin-sv",
    "TRX": "tron",
    "VET": "vechain",
    "THETA": "theta-token",
    "ICP": "internet-computer",
    "FIL": "filecoin",
    "NEAR": "near",
    "ALGO": "algorand",
    "MINA": "mina-protocol",
}

def fiyat_getir(symbol):
    """Fetch crypto price from CoinGecko"""
    symbol_upper = symbol.upper()
    
    # Get CoinGecko ID from mapping
    coingecko_id = CRYPTO_ID_MAP.get(symbol_upper)
    
    if not coingecko_id:
        return None
    
    try:
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coingecko_id}&vs_currencies=usd"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if coingecko_id in data and "usd" in data[coingecko_id]:
            fiyat = data[coingecko_id]["usd"]
            return round(fiyat, 2)
    except Exception as e:
        print(f"Error fetching price: {e}", file=sys.stderr)
    
    return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
        fiyat = fiyat_getir(symbol)
        if fiyat is not None:
            print(json.dumps({"price": fiyat}))
        else:
            print(json.dumps({"error": f"Could not fetch price for {symbol}"}))
    else:
        print(json.dumps({"error": "No symbol provided"}))
