import json
import os

transcript_path = r"C:\Users\Maria Alejandra\.gemini\antigravity\brain\7d71347c-cf1f-4da4-8b14-3ed511fceeac\.system_generated\logs\transcript.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get('step_index')
                if step >= 1986 and step <= 2010:
                    print(f"\n--- Step {step} ({data.get('source')}, {data.get('type')}) ---")
                    content = data.get('content', '')
                    if content:
                        print(content[:1000] + ("..." if len(content) > 1000 else ""))
                    if data.get('tool_calls'):
                        print("Tool calls:", [t.get('name') for t in data.get('tool_calls')])
            except Exception as e:
                pass
else:
    print("Transcript not found")
