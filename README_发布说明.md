# 我的英雄杀 · 在线分发（GitHub + jsDelivr 获取扩展源）

把整合包挂到 GitHub，由 **jsDelivr CDN** 给游戏内"获取扩展"提供文件。朋友只需**一次**添加"获取扩展地址"，之后你发新版他们点一下"更新扩展"即可，**不用再发 zip、不用教导入**。

> 这条通道是**你自己加的私有源**，不会进任何游戏内榜单，只有拿到 URL 的人能下——天然满足"只给朋友和自己"。

---

## 一、为什么不用 Gitee（已逐一实锤）

| 路线 | 结果 | 原因 |
|---|---|---|
| Gitee raw 直链 `…/raw/master/` | ❌ 不可用 | 302 跳到 `raw.giteeusercontent.com`，该域名**不发 CORS 头**，游戏内 `fetch` 跨域被拦 → `Failed to fetch`（curl 实锤） |
| Gitee Pages `…gitee.io` | ❌ 已下线 | **官方 2024-05-01 确认下线**："由于不可抗原因，Pages 服务已经下线，暂无具体计划再次上线" |
| Gitee 私有仓 | ❌ 不可用 | 游戏匿名 fetch，私有仓拉不到 |
| jsDelivr 的 gitee 端点 `…/gitee/…` | ❌ 已失效 | 返回 404，jsDelivr 早已取消 Gitee 镜像 |

**唯一 CORS 过关且国内可达**：jsDelivr 的 **GitHub 端点** `cdn.jsdelivr.net/gh/…`（实测 `HTTP 200` + `access-control-allow-origin: *`）。所以方案是：文件放 GitHub 公开仓，游戏填 jsDelivr 的 gh 地址。

> 你在 Gitee 上那个 `wuming-sha-ext` 仓库可以留着当源码备份，但**游戏内获取扩展不能用它**（上面已说明）。

---

## 二、整体原理（已对照无名杀源码核实）

游戏"获取扩展地址"把填的地址当成**文件根目录 `extensionURL`**：

1. 打开"获取扩展"标签 → 请求 `extensionURL + "catalog.js"`（用 `security.eval` 执行，填充 `window.extension`）。
2. `catalog.js` 里每个扩展项带 `author/size/date/intro/version/files`，游戏据此画"下载扩展 / 更新扩展"按钮。
3. 点下载/更新 → 按 `files` 列表拉**散文件**（不是 zip）：
   - 自动补 `extensionURL<扩展名>/extension.js`
   - 再拉 `extensionURL<扩展名>/<files 里每一项>`
4. **更新判定靠版本号**：已装扩展的 `extension_<名>_version` 与 catalog 的 `version` 不一致 → 显示"更新扩展"。所以每次改包把版本号往上提，朋友点一下就自动覆盖+提示重启。

---

## 三、本目录产物（已生成，可直接用）

```
在线发布/                      ← 这就是你要推到 GitHub 仓库根的内容
  catalog.js                   ← 清单（自动生成）
  我的英雄杀/                  ← 扩展名，必须 = info.json 的 name
    extension.js
    info.json
    image/character/*.jpg      ← 10 张立绘
  publish.py                   ← 一键发布脚本（下次改包重跑即可）
```

- 扩展名：`我的英雄杀`（中文；jsDelivr 支持中文路径，部署后我会帮你 curl 复核，万一不行再改英文 id）。
- 版本：`4.1.1`（来自 zip 内 info.json，三处版本号自动一致）。

---

## 四、GitHub 建仓与推送（你做一遍）

### 1. 新建 GitHub 公开仓库
- 登录 https://github.com → 右上角 **＋** → **New repository**
- **Repository name**：`wuming-sha-ext`（小写英文）
- **Visibility**：选 **Public**（私有仓游戏匿名拉不到，jsDelivr 也抓不到）
- **不要**勾 "Add a README file" 等初始化项（保持空仓库，避免和本地冲突）
- 点 **Create repository**

### 2. 生成 Personal Access Token（PAT）
- GitHub 网页 → 右上角头像 → **Settings** → 左侧最底部 **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**
- **Note**：随便填，如 `wuming-sha-ext-push`
- **Expiration**：选 `No expiration`（或自定义；过期后需重生成并重设远程）
- **Select scopes**：勾选 **`repo`**（第一项全选，含所有子项）
- 拉到底点 **Generate token**
- ⚠️ **复制那串 `ghp_xxx` 令牌**（只显示这一次，关页就看不到了），临时存到记事本

### 3. 本地推送（在你那个 PowerShell 窗口）
把 `<gh用户>` 换成你的 GitHub 用户名、`<令牌>` 换成刚复制的 `ghp_xxx`：

```powershell
# 进入发布目录（用完整 git 路径，若 git 已能识别可去掉前缀）
cd "F:\ai-\无名杀\在线发布"

# 本地分支改名 main（与 GitHub 默认一致；你之前是 master，改一次即可）
& "E:\workbuddy\resources\vendor\PortableGit\mingw64\bin\git.exe" branch -M main

# 把 origin 指向 GitHub（覆盖掉之前的 Gitee 地址）
& "E:\workbuddy\resources\vendor\PortableGit\mingw64\bin\git.exe" remote set-url origin https://<gh用户>:<令牌>@github.com/<gh用户>/wuming-sha-ext.git

# 推送
& "E:\workbuddy\resources\vendor\PortableGit\mingw64\bin\git.exe" push -u origin main
```

- 若你的默认分支实际是 `master`（不是 `main`），把上面两处 `main` 改成 `master`，且**跳过 `branch -M main`**。
- 成功后终端显示 `main -> main`（或 `master -> master`）。

> 把令牌写进远程地址只是个人发布便利；若介意，可改用工件管理器存凭据（不写进 URL）。

### 4. 记下"获取扩展地址"（用 jsDelivr，不是 github.com 直连）
```
https://cdn.jsdelivr.net/gh/<gh用户>/wuming-sha-ext@main/
```
⚠️ **结尾必须有 `/`**（对应 `extensionURL`）。若你用的是 `master` 分支，把 `@main` 改成 `@master`。

> **为什么用 jsDelivr 而不是直接 github.com 直连**：github.com 的 raw（`raw.githubusercontent.com`）在国内常被墙，且同样有 CORS/跳转问题；jsDelivr 是国内可达、CORS 过关的 CDN，朋友下载走它、**完全不用 VPN**。

---

## 五、朋友那边（只做一次）

1. 设置 → 通用 → **获取扩展地址** → 添加（名称随便，如"我的DIY源"）→ 地址粘贴你给的 jsDelivr 地址（结尾带 `/`）。
2. 返回"获取扩展"标签页 → 找到"我的英雄杀" → 点**下载扩展**。
3. 提示重启 → **完全关闭并重启游戏** → 扩展管理里打开开关即可玩。

之后你发新版：你 push 新文件 → 等 jsDelivr 刷新（几分钟）→ 朋友重开"获取扩展" → 按钮变**更新扩展** → 点一下 → 重启。完事。

---

## 六、你下次发新版的固定流程

1. 改包时按既有规范提版本号（小更新 `V4.1.2`，加角色 `V4.2.0`，大改 `V5.0.0`），**版本号三处同步**：
   - `make_myhero_v41.py` 里的 `version`（extension.js / info.json / 守卫）
   - 重新 `python3 make_myhero_v41.py --pack` 生成新 `正式包/我的英雄杀_vX.Y.Z.zip`
2. 重跑发布脚本（自动读新 zip、重新生成 catalog.js 与目录）：
   ```bash
   cd "F:/ai-/无名杀/在线发布"
   python3 publish.py
   ```
3. 把 `在线发布/` 下更新过的 `catalog.js` 和 `我的英雄杀/`（整目录覆盖）推到 GitHub：
   ```bash
   git add -A && git commit -m "我的英雄杀 vX.Y.Z" && git push
   ```
4. 等 jsDelivr 缓存刷新（通常几分钟，首次最长约 10 分钟）→ 通知朋友去点"更新扩展"。

---

## 七、必踩坑提醒

- **必须放散文件，不是 zip**：zip 只能走"导入扩展"手动选，走不了在线更新。
- **`files` 不要列 `extension.js`**：游戏会自动补，列了会重复下载。
- **版本号三处一致**：`extension.js` 内 `version` / `info.json` 的 `version` / `catalog.js` 的 `version`。任一不一致，"更新"按钮不亮或误判。
- **新增立绘必须加进 `files`**：`publish.py` 已自动枚举 `image/character/` 全部图片，只要用脚本就不用手管；但如果你手改过 zip，记得重跑脚本。
- **地址结尾 `/`**：漏掉会导致路径拼错下载失败。
- **jsDelivr 缓存延迟**：GitHub push 后 jsDelivr 不是实时生效，几分钟~十几分钟内才刷新；若朋友点"更新扩展"仍显示旧版，稍等再试。
- **中文扩展名兜底**：若实测发现 jsDelivr 拉中文路径（`我的英雄杀/`）异常，把扩展名改成英文 `myhero`（`make_myhero_v41.py` 的 name + info + 重跑 `publish.py`），所有路径变 ASCII 即彻底规避。

---

## 八、要你补的信息

- `publish.py` 顶部 `GH_USER / GH_REPO / GH_BRANCH` 仅用于打印提示，不影响产物；仓库真实信息在第四步手动拼地址即可。
- `catalog.js` 的 `author` 当前是占位"你的名字"（来自 info.json）。想要真名，改 `info.json` 的 author 后重跑 `make_myhero` 与 `publish.py` 即可。
