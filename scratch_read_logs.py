import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

log_file = r"C:\Users\Maria Alejandra\.gemini\antigravity\brain\7d71347c-cf1f-4da4-8b14-3ed511fceeac\.system_generated\logs\transcript.jsonl"
messages = []

with open(log_file, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            step = data.get('step_index')
            if step is not None and 1920 <= step <= 1955:
                messages.append(data)
        except Exception as e:
            pass

print(f"Total messages in range: {len(messages)}")
for msg in messages:
    print("="*40)
    print(f"STEP: {msg.get('step_index')} | SOURCE: {msg.get('source')} | TYPE: {msg.get('type')}")
    content = msg.get('content')
    if content:
        print(content[:1000])
    else:
        print("Tool calls:", msg.get('tool_calls'))
