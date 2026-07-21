import firebase_admin
from firebase_admin import credentials, db
import json

cred = credentials.Certificate('./backend_service_account.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://riskops-75637-default-rtdb.firebaseio.com/'
})

ref = db.reference('shift_reports')
data = ref.order_by_key().limit_to_last(10).get()
print(json.dumps(data, indent=2))
