import os
import json

def build_docs():
    folder_path = "Procesos"
    if not os.path.exists(folder_path):
        return
        
    valid_extensions = {".pdf", ".mp4", ".docx", ".doc", ".xlsx", ".xls", ".html"}
    files = []
    
    for f in os.listdir(folder_path):
        if os.path.isfile(os.path.join(folder_path, f)):
            ext = os.path.splitext(f)[1].lower()
            if ext in valid_extensions:
                files.append(f)
                
    files.sort()
    
    with open("procesos_list.json", "w", encoding="utf-8") as f:
        json.dump(files, f, ensure_ascii=False, indent=4)
        
    print(f"Generado procesos_list.json con {len(files)} archivos.")

if __name__ == "__main__":
    build_docs()
