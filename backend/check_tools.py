import json
import os

log_path = r"C:\Users\hp\.gemini\antigravity\brain\86935bcc-9361-4f68-86f8-540cbf97ef2d\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            try:
                data = json.loads(line)
                step_idx = data.get('step_index')
                if 'tool_calls' in data:
                    for tc in data['tool_calls']:
                        name = tc.get('name')
                        args = tc.get('args', {})
                        target = args.get('TargetFile', '') or args.get('AbsolutePath', '')
                        if 'Dashboard.jsx' in str(target) or 'Dashboard.jsx' in str(args):
                            print(f"Step {step_idx}: Tool '{name}' targeted Dashboard.jsx")
            except Exception as e:
                pass
