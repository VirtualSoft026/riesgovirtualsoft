import json

def parse_mstr_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    attributes = data['result']['definition']['availableObjects']['attributes']
    metrics = data['result']['definition']['availableObjects']['metrics']
    
    attr_names = [a['name'] for a in attributes]
    metric_names = [m['name'] for m in metrics]
    
    print("Attributes found:", attr_names)
    
    # Extract data rows
    if 'data' in data and 'paging' in data['data']:
        print("Data keys:", data['data'].keys())
    
    if 'data' in data['result']:
        root = data['result']['data']['root']
        print("Root keys:", root.keys())
def extract_flat_data(node, current_row, all_rows):
    if 'element' in node:
        current_row.append(node['element']['formValues'].popitem()[1])
        
    if 'children' in node:
        for child in node['children']:
            extract_flat_data(child, current_row.copy(), all_rows)
    else:
        # leaf node
        all_rows.append(current_row)

if __name__ == '__main__':
    with open('temp_mstr_raw.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    if 'paging' in data.get('result', {}).get('data', {}):
        print("Paging data in result:", data['result']['data']['paging'])
        
    root = data['result']['data']['root']
    all_rows = []
    extract_flat_data(root, [], all_rows)
    
    print("Parsed rows:", len(all_rows))
    if len(all_rows) > 0:
        print("First row:", all_rows[0])
