import pandas as pd
import json

try:
    df = pd.read_excel('Retiros/Retiros Abril.xlsx', nrows=5)
    
    output = {
        'columns': list(df.columns),
        'sample_data': df.to_dict(orient='records')
    }
    
    print(json.dumps(output, indent=2, default=str))
except Exception as e:
    print(f"Error reading file: {e}")
