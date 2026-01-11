
from tefas import Crawler
from datetime import datetime, timedelta

tefas = Crawler()

def test_range(months):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30*months)
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")
    
    print(f"Testing {months} months ({start_str} to {end_str})...")
    try:
        data = tefas.fetch(start=start_str, end=end_str, name="MAC", kind="YAT")
        print(f"Result: {len(data)} rows")
    except Exception as e:
        print(f"Failed: {e}")

test_range(1)
test_range(3)
test_range(6)
test_range(12)
