# 我的英雄杀 · 在线分发（Gitee 获取扩展源）

把整合包挂到 Gitee，朋友只需**一次**添加"获取扩展地址"，之后你发新版他们点一下"更新扩展"即可，**不用再发 zip、不用教导入**。

> 这条通道是**你自己加的私有源**，不会进任何游戏内榜单，只有拿到 URL 的人能下——天然满足"只给朋友和自己"。

---

## 一、整体原理（已对照无名杀源码核实）

游戏"获取扩展地址"把填的地址当成**文件根目录 `extensionURL`**：

1. 打开"获取扩展"标签 → 请求 `extensionURL + "catalog.js"`（用 `security.eval` 执行，填充 `window.extension`）。
2. `catalog.js` 里每个扩展项带 `author/size/date/intro/version/files`，游戏据此画"下载扩展 / 更新扩展"按钮。
3. 点下载/更新 → 按 `files` 列表拉**散文件**（不是 zip）：
   - 自动补 `extensionURL<扩展名>/extension.js`
   - 再拉 `extensionURL<扩展名>/<files 里每一项>`
4. **更新判定靠版本号**：已装扩展的 `extension_<名>_version` 与 catalog 的 `version` 不一致 → 显示"更新扩展"。所以每次改包把版本号往上提，朋友点一下就自动覆盖+提示重启。

---

## 二、本目录产物（已生成）

```
在线发布/                      ← 这就是你要推到 Gitee 仓库根的内容
  catalog.js                   ← 清单（自动生成）
  我的英雄杀/                  ← 扩展名，必须 = info.json 的 name
    extension.js
    info.json
    image/character/*.jpg      ← 10 张立绘
  publish.py                   ← 一键发布脚本（下次改包重跑即可）
```

- 扩展名：`我的英雄杀`（中文，游戏 fetch 会自动做百分号编码，Gitee 实测可下）。
- 版本：`4.1.1`（来自 zip 内 info.json，三处版本号自动一致）。

---

## 三、Gitee 建仓与推送（你做一遍）

1. 登录 https://gitee.com → 新建仓库（**必须 public**，私有仓游戏匿名拉不到）。
2. 仓库名举例 `wuming-sha-ext`，默认分支记一下（Gitee 通常是 `master`）。
3. 把 `在线发布/` 下**全部内容**（`catalog.js` + `我的英雄杀/`）放进仓库根：
   ```bash
   # 在本地某个目录
   git clone https://gitee.com/<你的用户名>/wuming-sha-ext.git
   cp -r "F:/ai-/无名杀/在线发布/catalog.js"  wuming-sha-ext/
   cp -r "F:/ai-/无名杀/在线发布/我的英雄杀"  wuming-sha-ext/
   cd wuming-sha-ext
   git add -A
   git commit -m "我的英雄杀 v4.1.1 在线源"
   git push
   ```
4. 记下你的"获取扩展地址"：
   ```
   https://gitee.com/<你的用户名>/wuming-sha-ext/raw/master/
   ```
   ⚠️ **结尾必须有 `/`**（对应 `extensionURL`）。如果默认分支是 `main` 把 `master` 换成 `main`。

> 备选：若 Gitee raw 偶尔抽风/限流，可改用 **Gitee Pages**（`https://<用户名>.gitee.io/wuming-sha-ext/`），代价是每次 push 后去 Pages 设置点一下"更新"。raw 直链是首选（push 即生效）。

---

## 四、朋友那边（只做一次）

1. 设置 → 通用 → **获取扩展地址** → 添加 → 粘贴你给的地址（结尾带 `/`）。
2. 返回"获取扩展"标签页 → 找到"我的英雄杀" → 点**下载扩展**。
3. 提示重启 → 重启游戏 → 扩展管理里打开开关即可玩。

之后你发新版：你 push 新文件 → 朋友重开"获取扩展" → 按钮变**更新扩展** → 点一下 → 重启。完事。

---

## 五、你下次发新版的固定流程

1. 改包时按既有规范提版本号（小更新 `V4.1.2`，加角色 `V4.2.0`，大改 `V5.0.0`），**版本号三处同步**：
   - `make_myhero_v41.py` 里的 `version`（extension.js / info.json / 守卫）
   - 重新 `python3 make_myhero_v41.py --pack` 生成新 `正式包/我的英雄杀_vX.Y.Z.zip`
2. 重跑发布脚本（自动读新 zip、重新生成 catalog.js 与目录）：
   ```bash
   cd "F:/ai-/无名杀/在线发布"
   python3 publish.py
   ```
3. 把 `在线发布/` 下更新过的 `catalog.js` 和 `我的英雄杀/`（整目录覆盖）推到 Gitee：
   ```bash
   git add -A && git commit -m "我的英雄杀 vX.Y.Z" && git push
   ```
4. 通知朋友去点"更新扩展"。

---

## 六、必踩坑提醒

- **必须放散文件，不是 zip**：zip 只能走"导入扩展"手动选，走不了在线更新。
- **`files` 不要列 `extension.js`**：游戏会自动补，列了会重复下载。
- **版本号三处一致**：`extension.js` 内 `version` / `info.json` 的 `version` / `catalog.js` 的 `version`。任一不一致，"更新"按钮不亮或误判。
- **新增立绘必须加进 `files`**：`publish.py` 已自动枚举 `image/character/` 全部图片，只要用脚本就不用手管；但如果你手改过 zip，记得重跑脚本。
- **地址结尾 `/`**：漏掉会导致路径拼错下载失败。
- **首次部署实测一次**：中文目录名 + Gitee raw 的匿名拉取，建议第一次推完后自己用"获取扩展"下一遍验证能正常下载/显示立绘。

---

## 七、要你补的信息

- `publish.py` 顶部 `GITEE_USER / GITEE_REPO / GITEE_BRANCH` 仅用于打印提示，不影响产物；仓库真实信息在第三步手动拼地址即可。
- `catalog.js` 的 `author` 当前是占位"你的名字"（来自 info.json）。想要真名，改 `info.json` 的 author 后重跑 `make_myhero` 与 `publish.py` 即可。
