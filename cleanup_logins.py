import json
import urllib.request
import time

current_time = int(time.time() * 1000)

url = "https://riskops-75637-default-rtdb.firebaseio.com/login_logs.json"
req = urllib.request.Request(url)
response = urllib.request.urlopen(req)
logs = json.loads(response.read())

if not logs:
    print("No logs found.")
    exit(0)

# Group open sessions by user name
open_sessions = {}

for key, log in logs.items():
    if not log.get("logoutTime"):
        name = log.get("name", "").lower()
        if name not in open_sessions:
            open_sessions[name] = []
        open_sessions[name].append((key, log.get("timestamp", 0)))

count = 0
for name, sessions in open_sessions.items():
    if len(sessions) > 1:
        # Sort by timestamp, oldest first
        sessions.sort(key=lambda x: x[1])
        
        # All except the last one (most recent) should be closed
        for i in range(len(sessions) - 1):
            key_to_close = sessions[i][0]
            url_update = f"https://riskops-75637-default-rtdb.firebaseio.com/login_logs/{key_to_close}.json"
            patch_data = json.dumps({"logoutTime": current_time}).encode('utf-8')
            req_update = urllib.request.Request(url_update, data=patch_data, method='PATCH')
            urllib.request.urlopen(req_update)
            count += 1
            print(f"Closed old session for {name}")

print(f"Finished closing {count} duplicate older sessions.")
