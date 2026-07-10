import requests

def get_firebase_gestores():
    res = requests.get('https://riskops-75637-default-rtdb.firebaseio.com/users.json')
    users = res.json()
    mapping = {}
    for uid, u in users.items():
        if u.get('approved') == True:
            name = u.get('name', '').strip()
            email = u.get('email', '').strip().lower()
            
            # 1. Email exacto
            mapping[email] = name
            
            # 2. Prefijo del correo
            if '@' in email:
                mapping[email.split('@')[0]] = name
                
            # 3. Nombre exacto en minúsculas
            mapping[name.lower()] = name
            
            # 4. Primer Nombre + Primer Apellido
            parts = name.lower().split()
            if len(parts) >= 2:
                mapping[f"{parts[0]} {parts[1]}"] = name
                
    # Overrides comunes de MSTR a Firebase
    mapping['oriana borjs'] = mapping.get('oriana.borja', 'Oriana Borja Romero')
    
    return mapping

print(get_firebase_gestores())
