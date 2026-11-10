#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把扁平 zip 整合包 转换成 无名杀「获取扩展」在线源（Gitee 可托管布局）。

产物（本脚本输出到 在线发布/ 目录，即 Gitee 仓库根内容）：
    在线发布/
      catalog.js              ← 清单（游戏读它决定显示/更新什么）
      我的英雄杀/             ← 扩展名（= info.json 的 name，必须一致）
        extension.js
        info.json
        image/character/*.jpg

用法：
    python3 publish.py                       # 默认读 正式包/我的英雄杀_v4.1.1.zip
    python3 publish.py <zip路径>             # 指定 zip
    python3 publish.py --clean               # 先清空 我的英雄杀/ 再生成

注意：
- 清单 files 不含 extension.js（游戏会自动补），只列 info.json 与全部立绘。
- version 直接读 zip 内 info.json，保证三处版本号（extension.js / info.json / catalog.js）一致。
- 改包后只需重跑本脚本 + git push，朋友那边点「更新扩展」即可，无需重发 zip。
"""

import datetime
import json
import os
import shutil
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # F:/ai-/无名杀
RELEASE = os.path.join(ROOT, "正式包")
OUT_DIR = os.path.dirname(os.path.abspath(__file__))                # 在线发布/

DEFAULT_ZIP = os.path.join(RELEASE, "我的英雄杀_v4.1.1.zip")

# Gitee 仓库信息（仅用于 README 提示，不影响产物）。改仓库后同步改这里。
GITEE_USER = "你的Gitee用户名"
GITEE_REPO = "wuming-sha-ext"
GITEE_BRANCH = "master"   # Gitee 默认分支通常是 master；请按实际仓库确认


def gather_files(z):
    """返回 (name, version, author, intro, 相对文件路径列表[不含 extension.js])。"""
    names = z.namelist()
    assert "info.json" in names and "extension.js" in names, "zip 缺核心文件"

    info = json.loads(z.read("info.json").decode("utf-8"))
    ext_name = info.get("name")
    version = info.get("version")
    author = info.get("author", "")
    intro = info.get("intro", "")
    assert ext_name, "info.json 缺 name"

    files = []
    for n in names:
        if n.endswith("/"):
            continue
        if n == "extension.js":
            continue  # 游戏自动加
        files.append(n)
    files.sort()
    return ext_name, version, author, intro, files


def extract(z, ext_name):
    target = os.path.join(OUT_DIR, ext_name)
    if "--clean" in sys.argv and os.path.isdir(target):
        shutil.rmtree(target)
    os.makedirs(target, exist_ok=True)
    for n in z.namelist():
        if n.endswith("/"):
            continue
        # n 已是相对路径（extension.js / info.json / image/character/xxx.jpg），
        # 直接落到 我的英雄杀/ 下，保持游戏要求的目录结构。
        dest = os.path.join(target, n)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(z.read(n))
    return target


def total_size(ext_name):
    total = 0
    base = os.path.join(OUT_DIR, ext_name)
    for root, _, fs in os.walk(base):
        for f in fs:
            total += os.path.getsize(os.path.join(root, f))
    return total


def human_size(b):
    if b >= 1024 * 1024:
        return "%.1f MB" % (b / 1024.0 / 1024.0)
    return "%.0f KB" % (b / 1024.0)


def write_catalog(ext_name, version, author, intro, files):
    today = datetime.date.today().isoformat()
    size = human_size(total_size(ext_name))
    fs = ",\n      ".join(json.dumps(f, ensure_ascii=False) for f in files)
    catalog = (
        "// 无名杀「获取扩展」清单 —— 由 publish.py 自动生成，请勿手改\n"
        "// 游戏请求 <获取扩展地址>catalog.js 后执行本文件填充 window.extension\n"
        "window.extension = {\n"
        '  %s: {\n'
        '    author: %s,\n'
        '    size: %s,\n'
        '    date: %s,\n'
        '    intro: %s,\n'
        '    version: %s,\n'
        "    files: [\n"
        "      %s\n"
        "    ],\n"
        "  },\n"
        "};\n"
    ) % (
        json.dumps(ext_name, ensure_ascii=False),
        json.dumps(author, ensure_ascii=False),
        json.dumps(size, ensure_ascii=False),
        json.dumps(today, ensure_ascii=False),
        json.dumps(intro, ensure_ascii=False),
        json.dumps(version, ensure_ascii=False),
        fs,
    )
    p = os.path.join(OUT_DIR, "catalog.js")
    with open(p, "w", encoding="utf-8") as f:
        f.write(catalog)
    return p, size, today


def main():
    zip_path = DEFAULT_ZIP
    for a in sys.argv[1:]:
        if not a.startswith("--") and a.endswith(".zip"):
            zip_path = a
    assert os.path.isfile(zip_path), "找不到 zip: " + zip_path

    z = zipfile.ZipFile(zip_path)
    ext_name, version, author, intro, files = gather_files(z)
    print("扩展名 :", ext_name)
    print("版本   :", version)
    print("作者   :", author)
    print("文件数 :", len(files), "(不含 extension.js)")

    extract(z, ext_name)
    catalog_p, size, today = write_catalog(ext_name, version, author, intro, files)

    print("大小   :", size)
    print("日期   :", today)
    print("---- 产物 ----")
    print("  ", catalog_p)
    print("  ", os.path.join(OUT_DIR, ext_name, "extension.js"))
    print("  ", os.path.join(OUT_DIR, ext_name, "info.json"))
    img_count = len([f for f in files if f.startswith("image/")])
    print("  ", os.path.join(OUT_DIR, ext_name, "image/character/ ... (%d 张)" % img_count))
    print("---- 下一步 ----")
    print("  1) 把 在线发布/ 下全部内容（catalog.js + %s/）推到 Gitee 仓库根" % ext_name)
    print("  2) 获取扩展地址填： https://gitee.com/%s/%s/raw/%s/" % (GITEE_USER, GITEE_REPO, GITEE_BRANCH))
    print("  3) 朋友：设置→通用→获取扩展地址→添加→粘贴上面地址→获取扩展→下载/更新")


if __name__ == "__main__":
    main()
