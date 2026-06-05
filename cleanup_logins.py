import json
import urllib.request
import time

current_time = int(time.time() * 1000)

url = "https://riskops-75637-default-rtdb.firebaseio.com/login_logs.json"
req = urllib.request.Request(url)
response = urllib.request.urlopen(req)
logs = json.loads(response.read())

url_active = "https://riskops-75637-default-rtdb.firebaseio.com/active_sessions.json"
try:
    response_active = urllib.request.urlopen(urllib.request.Request(url_active))
    active = json.loads(response_active.read())
    active_names = [v.get('name', '').lower() for k,v in active.items() if v] if active else []
except:
    active_names = []

count = 0
if logs:
    for key, log in logs.items():
        name = log.get("name", "").lower()
        if log.get("logoutTime"):
            if name in active_names:
                # Mark as open again
                url_update = f"https://riskops-75637-default-rtdb.firebaseio.com/login_logs/{key}/logoutTime.json"
                req_update = urllib.request.Request(url_update, method='DELETE')
                urllib.request.urlopen(req_update)
                count += 1
                print(f"Re-opened session for: {name}")

print(f"Finished opening {count} incorrectly closed sessions.")
