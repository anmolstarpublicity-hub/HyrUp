import requests
import json
from datetime import datetime

api_url = 'https://hyrup-production.up.railway.app/api/activity?start=2026-05-23&end=2026-05-23'
api_key = 'e616fffda5c50197244bec1d41d5387cb03bdd6a2ec27fd5a3ce428dfd518f05'

try:
    print("[TEST] Checking backend API for activity data...")
    resp = requests.get(api_url, headers={'X-API-Key': api_key}, timeout=10)
    print(f'Status: {resp.status_code}')
    
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list):
            print(f'Found {len(data)} total records')
            anmol_records = [r for r in data if r.get('Employee Name') == 'Anmol']
            print(f'Anmol records: {len(anmol_records)}')
            if anmol_records:
                print('Recent Anmol activity:')
                for r in anmol_records[-5:]:
                    print(f"  {r.get('Timestamp')} | {r.get('App/Website')} | {r.get('Duration')}m")
            else:
                print('No activity found for Anmol')
                print(f'Sample of all records: {data[:3]}')
        else:
            print(f'Response: {data}')
    else:
        print(f'Error response: {resp.text[:500]}')
except Exception as e:
    print(f'Exception: {e}')
