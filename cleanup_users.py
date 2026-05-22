import urllib.request, json

url = 'https://riskops-75637-default-rtdb.firebaseio.com/users.json'
req = urllib.request.Request(url)
response = urllib.request.urlopen(req)
users = json.loads(response.read().decode('utf-8'))

if users:
    email_map = {}
    for uid, user_data in users.items():
        email = user_data.get('email', '').lower()
        if not email: continue
        if email not in email_map:
            email_map[email] = []
        email_map[email].append({'uid': uid, 'data': user_data})

    deleted_count = 0
    for email, records in email_map.items():
        if len(records) > 1:
            def sort_key(r):
                is_approved = 1 if r['data'].get('approved') == True else 0
                reg_date = r['data'].get('registrationDate', '')
                return (is_approved, reg_date)

            records.sort(key=sort_key, reverse=True)
            keep = records[0]
            to_delete = records[1:]
            for d in to_delete:
                del_url = f"https://riskops-75637-default-rtdb.firebaseio.com/users/{d['uid']}.json"
                req_del = urllib.request.Request(del_url, method='DELETE')
                urllib.request.urlopen(req_del)
                deleted_count += 1
                print(f"Deleted duplicate for {email}: {d['uid']}")
    print(f"Done. Deleted {deleted_count} duplicates.")
else:
    print('No users found.')
