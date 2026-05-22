import subprocess

result = subprocess.run(["git", "diff", "app.js"], capture_output=True, text=True, encoding='utf-8')
with open("app_js_diff.txt", "w", encoding="utf-8") as f:
    f.write(result.stdout)
print("Diff written to app_js_diff.txt, size:", len(result.stdout))
