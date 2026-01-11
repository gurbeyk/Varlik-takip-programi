#!/usr/bin/env python3
import sys
import json
from datetime import datetime
import yfinance as yf
from tefas import Crawler

def fetch_history(symbol, asset_type, start_date_str):
    """
    Fetch historical prices for an asset from start_date to now.
    Supports: 
    - Funds (TEFAS)
    - Stocks/Crypto/ETF (Yahoo Finance)
    """
    results = []
    
    try:
        # 1. TEFAS Funds
        if asset_type in ['fon', 'befas']:
            import os
            import contextlib
            from datetime import timedelta
            
            with open(os.devnull, 'w') as devnull:
                with contextlib.redirect_stdout(devnull), contextlib.redirect_stderr(devnull):
                    Crawler.root_url = "https://www.tefas.gov.tr"
                    Crawler.headers["Origin"] = "https://www.tefas.gov.tr"
                    Crawler.headers["Referer"] = "https://www.tefas.gov.tr/TarihselVeriler.aspx"
                    
                    tefas = Crawler()
                    
                    # Parse start date
                    try:
                        s_date = datetime.strptime(start_date_str, "%Y-%m-%d")
                    except:
                        # Fallback or error
                        s_date = datetime.now() - timedelta(days=30)

                    end_date = datetime.now()
                    
                    # Chunking Loop (90 days chunks)
                    current_start = s_date
                    
                    param_kind = "EMK" if asset_type == 'befas' else "YAT"
                    
                    while current_start < end_date:
                        # Calculate chunk end
                        chunk_end = current_start + timedelta(days=90)
                        if chunk_end > end_date:
                            chunk_end = end_date
                            
                        c_start_str = current_start.strftime("%Y-%m-%d")
                        c_end_str = chunk_end.strftime("%Y-%m-%d")
                        
                        try:
                            # Fetch chunk
                            data = tefas.fetch(start=c_start_str, end=c_end_str, name=symbol.upper(), kind=param_kind)
                            
                            if not data.empty:
                                # Normalize column names
                                data.columns = [c.lower() for c in data.columns]
                                
                                for _, row in data.iterrows():
                                    d_val = row['date']
                                    if hasattr(d_val, 'strftime'):
                                        d_str = d_val.strftime("%Y-%m-%d")
                                    else:
                                        d_str = str(d_val) 
                                        
                                    results.append({
                                        "date": d_str,
                                        "price": float(row['price'])
                                    })
                        except Exception as chunk_err:
                            sys.stderr.write(f"Chunk failed {c_start_str}-{c_end_str}: {chunk_err}\n")
                        
                        # Move to next chunk
                        current_start = chunk_end + timedelta(days=1)
            
            return results

        # 2. Yahoo Finance (Stocks, US Stocks, Crypto, Gold, Benchmarks)
        else:
            # Format Symbol
            formatted_symbol = symbol.upper()
            if asset_type == 'hisse' and not formatted_symbol.endswith('.IS'):
                formatted_symbol += '.IS'
            elif asset_type == 'kripto' and not formatted_symbol.endswith('-USD'):
                formatted_symbol += '-USD'
            
            # Fetch
            # Suppress yfinance output
            import os
            import contextlib
            
            with open(os.devnull, 'w') as devnull:
                with contextlib.redirect_stdout(devnull), contextlib.redirect_stderr(devnull):
                     data = yf.download(formatted_symbol, start=start_date_str, progress=False, multi_level_index=False)
            
            if not data.empty:
                for date, row in data.iterrows():
                    results.append({
                        "date": date.strftime("%Y-%m-%d"),
                        "price": float(row['Close'])
                    })
            return results

    except Exception as e:
        # Return empty list or partial results on error
        sys.stderr.write(f"Error: {e}\n")
        return []

if __name__ == "__main__":
    import sys
    
    # Check if input is a JSON list (starts with [)
    input_arg = "[]"
    if len(sys.argv) > 1:
        input_arg = sys.argv[1]
    else:
        # Read from stdin
        if not sys.stdin.isatty():
            input_arg = sys.stdin.read()

    try:
        # Try processing as batch JSON
        if input_arg.strip().startswith('['):
            requests = json.loads(input_arg)
            batch_results = {}
            
            # Use threading to fetch in parallel
            from concurrent.futures import ThreadPoolExecutor
            
            def process_req(req):
                sym = req.get('symbol')
                typ = req.get('type')
                sda = req.get('startDate')
                if sym and typ and sda:
                    return sym, fetch_history(sym, typ, sda)
                return None, None

            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(process_req, req) for req in requests]
                for future in futures:
                    sym, data = future.result()
                    if sym:
                        batch_results[sym] = data
            
            print(json.dumps(batch_results))
            
        else:
            # Legacy single mode fallback
            if len(sys.argv) > 3:
                symbol = sys.argv[1]
                asset_type = sys.argv[2]
                start_date = sys.argv[3]
                hist = fetch_history(symbol, asset_type, start_date)
                print(json.dumps(hist))
            else:
                print(json.dumps([]))
                
    except Exception as e:
        # Ensure we always output valid JSON even on major failure
        sys.stderr.write(f"Critical Error: {e}\n")
        print(json.dumps({}))
