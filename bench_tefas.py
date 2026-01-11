
from tefas import Crawler
from datetime import datetime
import time

tefas = Crawler()

def bench(start_date):
    t0 = time.time()
    try:
        data = tefas.fetch(start=start_date, end="2024-12-18", name="MAC", kind="YAT")
        dur = time.time() - t0
        print(f"Start: {start_date} -> Duration: {dur:.2f}s, Rows: {len(data)}")
    except Exception as e:
        print(f"Start: {start_date} -> Failed: {e}")

print("Benchmarking...")
bench("2024-01-01") # ~1 year
bench("2021-12-18") # ~3 years
