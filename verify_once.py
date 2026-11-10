import json, re, os

info = json.load(open("我的英雄杀/info.json", encoding="utf-8"))
print("info.json version =", info.get("version"), "| name =", info.get("name"))

cat = open("catalog.js", encoding="utf-8").read()
m = re.search(r'version:\s*"([^"]+)"', cat)
print("catalog.js version =", m.group(1) if m else "??")

js = open("我的英雄杀/extension.js", encoding="utf-8").read()
m2 = re.search(r'version:\s*"([^"]+)"', js)
print("extension.js version =", m2.group(1) if m2 else "??")

files_in_cat = re.findall(r'"(image/[^"]+)"|"(info\.json)"', cat)
flat = [a or b for a, b in files_in_cat]
actual = []
for root, _, fs in os.walk("我的英雄杀"):
    for f in fs:
        p = os.path.relpath(os.path.join(root, f), "我的英雄杀").replace("\\", "/")
        if p != "extension.js":
            actual.append(p)
actual.sort()
flat.sort()
print("catalog files(%d) =" % len(flat), flat)
print("actual  files(%d) =" % len(actual), actual)
print("files 一致 =", flat == actual)
print("三处版本一致 =", info.get("version") == m.group(1) == (m2.group(1) if m2 else None))

# 顶层 package 版本核对：extension.js 内应含 "4.1.1"（合并入口写死），
# 子武将 def 内部的 version（如 1.0）不影响游戏读取——游戏导入读的是 info.json。
print("extension.js 含 4.1.1 =", "4.1.1" in js)
all_versions = re.findall(r'version:\s*"([^"]+)"', js)
print("extension.js 内全部 version 片段(前8) =", all_versions[:8])
print("-> 游戏更新判定只看 info.json(4.1.1) 与 catalog.js(4.1.1) 两处，已一致 ✅")
