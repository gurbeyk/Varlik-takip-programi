
from tefas import Crawler
from datetime import datetime

tefas = Crawler()
# Try YYYY-MM-DD
print("Testing YYYY-MM-DD...")
try:
    data = tefas.fetch(start="2024-01-01", end="2024-01-10", name="MAC", kind="YAT")
    print(f"YYYY-MM-DD Result count: {len(data)}")
    if not data.empty:
        print(data.head())
except Exception as e:
    print(f"YYYY-MM-DD Failed: {e}")

# Try DD.MM.YYYY
print("\nTesting DD.MM.YYYY...")
try:
    data = tefas.fetch(start="01.01.2024", end="10.01.2024", name="MAC", kind="YAT")
    print(f"DD.MM.YYYY Result count: {len(data)}")
    if not data.empty:
        print(data.head())
except Exception as e:
    print(f"DD.MM.YYYY Failed: {e}")
