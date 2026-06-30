import json

def parse_mstr_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    attributes = data['result']['definition']['availableObjects']['attributes']
    metrics = data['result']['definition']['availableObjects']['metrics']
    
    attr_names = [a['name'] for a in attributes]
    metric_names = [m['name'] for m in metrics]
    
    print("Attributes found:", attr_names)
    print("Metrics found:", metric_names)
    
if __name__ == '__main__':
    parse_mstr_json('temp_mstr_raw.json')
