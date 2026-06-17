# 星途影视 OTA 自动更新方案

> 版本：v1.25.0 | 最后更新：2026-06-08

---

## 一、架构概览

```
┌─────────────────────────────────────────────────────────┐
│                     App 启动                             │
│                App.vue → onLaunch()                      │
│                       │                                  │
│            ┌──────────┴──────────┐                      │
│            ▼                     ▼                       │
│     有网络？(3s后)        手动触发(个人中心)                │
│            │                     │                       │
│            └──────────┬──────────┘                      │
│                       ▼                                  │
│              checkUpdate()                               │
│                  │                                       │
│         ┌───────┴───────┐                               │
│         ▼               ▼                               │
│    有更新 → 弹窗      无更新 → Toast提示                  │
│         │                                                │
│    ┌────┴────┐                                           │
│    ▼         ▼                                           │
│  强制更新   可选更新                                       │
│  (不可取消)  (可稍后)                                     │
│    │         │                                           │
│    └────┬────┘                                           │
│         ▼                                                │
│  downloadAndInstall()                                    │
│     ├── 下载 (进度实时展示)                                │
│     ├── MD5 完整性校验                                    │
│     ├── 存储空间检查                                      │
│     └── 6 级安装策略（串联降级）                           │
└─────────────────────────────────────────────────────────┘
```

---

## 二、触发时机

| 触发方式 | 入口 | 行为 |
|----------|------|------|
| **自动检测** | `App.vue` → `onLaunch()` | 启动 3 秒后，有网络时静默检查 |
| **手动检测** | 手机版/电视版 个人中心 → "检查更新"按钮 | 调用 `checkUpdate(true)`，无更新也提示 |

### 自动检测代码（App.vue）

```js
// 启动后检查网络，有网才发起更新检查
checkNetworkAndUpdate() {
  try {
    const main = plus.android.runtimeMainActivity()
    const cm = main.getSystemService("connectivity")
    const activeNetwork = cm.getActiveNetworkInfo()
    if (activeNetwork && activeNetwork.isConnected()) {
      setTimeout(() => { checkUpdate() }, 3000)  // 3秒延迟，避免影响启动速度
    }
  } catch (e) {
    setTimeout(() => { checkUpdate() }, 3000)     // 降级：直接尝试
  }
}
```

### 频率限制

- 自动检测有 **1 小时冷却**（`CHECK_INTERVAL = 3600000`），避免频繁请求
- 手动检测无冷却限制

---

## 三、版本比较机制

### 版本号定义

**唯一入口文件：** `src/utils/version.js`

```js
export const VERSION_NAME = "1.25.0"   // 展示版本号（语义化）
export const VERSION_CODE = 350        // 比较版本号（纯数字，递增10）
```

### 比较逻辑

```js
const currentVersionCode = VERSION_CODE   // 本地 350

// 请求远程 JSON
GET https://api.move.wuyaoxuexi.cn/tvbox_update.json

// 比较
if (res.versionCode > currentVersionCode) {
  // 有新版本 → 弹窗
}
```

> **规则：** 只用 `versionCode` 比较，`versionName` 仅用于展示。

### 远程更新 JSON 格式

```json
{
  "versionCode": 360,
  "versionName": "1.26.0",
  "downloadUrl": "https://example.com/星途影视_v1.26.0.apk",
  "forceUpdate": false,
  "updateLog": "1. 修复播放器闪退\n2. 优化加载速度\n3. 新增手机版",
  "md5": "a1b2c3d4e5f6..."
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `versionCode` | Number | **是** | 比较用，必须 > 本地才触发更新 |
| `versionName` | String | 否 | 展示用 |
| `downloadUrl` | String | **是** | APK 下载地址 |
| `forceUpdate` | Boolean | 否 | 是否强制更新（不可取消） |
| `updateLog` | String | 否 | 更新日志 |
| `md5` | String | 否 | APK 文件的 MD5 哈希值 |

---

## 四、下载流程

### 下载器配置

```js
_dtask = plus.downloader.createDownload(url, {
  filename: "_downloads/update.apk",   // 存放到应用私有目录
  timeout: 120                          // 120秒超时
}, callback)
```

### 进度展示

通过 `statechanged` 事件实时反馈：

```js
_dtask.addEventListener("statechanged", (d, status) => {
  if (status === 3) {  // 下载中
    const pct = Math.round(d.downloadedSize / d.totalSize * 100)
    const dlMB = (d.downloadedSize / 1024 / 1024).toFixed(1)
    const tMB = (d.totalSize / 1024 / 1024).toFixed(1)
    uni.showToast({ title: `下载中 ${pct}%\n${dlMB}MB / ${tMB}MB` })
  }
})
```

**用户看到的效果：**
```
下载中 45%
18.5MB / 42.5MB
```

### 防重复下载

- 全局标志 `_downloading`，同时只允许一个下载任务
- 下载中再次点击会提示"正在下载中，请稍候..."

### 下载完成校验

```
下载完成
  │
  ├── 文件存在性检查（排除空路径）
  ├── 文件大小检查（≥ 1MB 才算有效）
  └── 路径解析（plus路径 → 真实文件系统路径）
```

---

## 五、安全校验（三层防护）

### 5.1 MD5 完整性校验

下载完成后对比远程 MD5 与本地文件 MD5：

```java
// Java 层计算 MD5
FileInputStream → MessageDigest.getInstance("MD5")
分段读取 8KB buffer → sha256 → hex 字符串
```

- 不匹配 → 弹窗"是否重新下载？"，可选择重试
- 匹配 ✓ → 继续安装流程

### 5.2 存储空间检查

```
所需空间 = APK大小 × 1.5
使用 android.os.StatFs 计算剩余空间
```

- 不足 → 提示"存储空间不足，请清理后重试"
- 充足 ✓ → 继续安装流程

### 5.3 安装权限检查

Android 8.0+ 需要 `REQUEST_INSTALL_PACKAGES` 权限：

```js
function hasInstallPermission() {
  return main.getPackageManager().canRequestPackageInstalls()
}
```

- 无权限 → 跳转系统设置页 `ACTION_MANAGE_UNKNOWN_APP_SOURCES`
- 有权限 ✓ → 继续安装流程

---

## 六、安装策略（6 级级联降级）

安装按优先级依次尝试，任一成功即停止，全部失败则引导手动安装。

```
┌─────────────────────────────────────────────┐
│  MD5 校验 ✓ → 空间检查 ✓ → 权限检查 ✓        │
└─────────────────┬───────────────────────────┘
                  ▼
         ┌────────────────┐
         │ 方案0: ROOT静默  │  ← 最高优先级，无感安装
         ├────────────────┤
         │ 方案1: FilePro.. │  ← Android 7.0+ 标准方式
         ├────────────────┤
         │ 方案2: 公共目录   │  ← 权限要求最低
         ├────────────────┤
         │ 方案3: HBuilder  │  ← 官方 API
         ├────────────────┤
         │ 方案4: 文件管理   │  ← 系统选择器
         ├────────────────┤
         │ 方案5: 手动安装   │  ← 兜底方案
         └────────────────┘
```

### 方案0：ROOT 静默安装

```bash
# 检测 ROOT
su → exit code === 0

# 停止当前应用
am force-stop <packageName>

# 安装
pm install -r -d <apk_path>

# 安装成功 → 自动启动新版本
```

- **优点：** 完全无感，无需用户操作
- **前提：** 设备需 ROOT
- **失败则** → 方案1

### 方案1：FileProvider + ACTION_VIEW

```java
// 标准 Android 安装方式
Uri uri = FileProvider.getUriForFile(context, authority, apkFile)
Intent intent = new Intent(ACTION_VIEW)
intent.setDataAndType(uri, "application/vnd.android.package-archive")
intent.addFlags(FLAG_ACTIVITY_NEW_TASK | FLAG_GRANT_READ_URI_PERMISSION)
startActivity(intent)
```

- **原理：** 临时授权 URI，不需要存储权限
- **兼容：** Android 7.0+
- **降级：** 若 `androidx.core.content.FileProvider` 不存在 → 尝试 `android.support.v4.content.FileProvider` → 否则降级到 `Uri.fromFile`

### 方案2：复制到公共目录 + ACTION_VIEW

```
私有路径: /data/data/<package>/files/apps/<appid>/_downloads/update.apk
    ↓  FileInputStream → FileOutputStream (8KB buffer)
公共目录: /sdcard/Download/xingtu_update.apk
    ↓
Uri.fromFile → ACTION_VIEW 安装
```

- **为什么要复制？** 私有目录的 APK 无法被系统安装器读取
- **优化：** 若公共目录已有同大小文件，跳过复制
- **权限：** 需要 `WRITE_EXTERNAL_STORAGE`

### 方案3：plus.runtime.install

```js
plus.runtime.install(filePath, { force: true }, onSuccess, onFail)
```

- HBuilder 官方提供的安装 API

### 方案4：plus.runtime.openFile

```js
plus.runtime.openFile(filePath, {}, onSuccess, onFail)
```

- 调用系统文件管理器打开 APK

### 方案5：手动安装引导

```js
uni.showModal({
  title: "手动安装",
  content: `请用文件管理器打开以下路径手动安装：\n\n${installPath}`
})
```

---

## 七、文件存储位置

### 下载阶段（私有目录）

下载时 `plus.downloader` 将 APK 存到应用私有目录：

```
相对路径:  _downloads/update.apk

解析后的真实路径（二选一，取决于设备）：
  ├── /data/data/__UNI__B9F69F6/files/apps/__UNI__B9F69F6/_downloads/update.apk
  └── /storage/emulated/0/Android/data/__UNI__B9F69F6/files/apps/__UNI__B9F69F6/_downloads/update.apk
```

> 私有目录的 APK **无法被系统安装器直接识别**，所以需要通过 FileProvider 临时授权或复制到公共目录。

### 安装阶段（公共目录）

方案2 安装时，会将 APK 复制到公共 Downloads 目录：

```
复制目标:  /sdcard/Download/xingtu_update.apk
         (即 /storage/emulated/0/Download/xingtu_update.apk)
```

**复制策略：**
- 先尝试 `Environment.getExternalStoragePublicDirectory(DIRECTORY_DOWNLOADS)`
- 失败则遍历 `/sdcard/Download` → `/storage/emulated/0/Download` → `/mnt/sdcard/Download`
- 若目标已有同大小文件（MD5 已通过校验），跳过复制，直接使用

```
文件流转路径：
┌──────────────────────────────────────────────────────┐
│  服务器 APK                                           │
│    ↓ 下载                                             │
│  /data/data/__UNI__B9F69F6/.../update.apk  (私有)    │
│    ↓ MD5 校验 ✓                                       │
│    ↓ 安装尝试                                         │
│  ┌─ 方案1: FileProvider 直接用私有路径                 │
│  └─ 方案2: 复制到 ↓                                  │
│       /sdcard/Download/xingtu_update.apk  (公共)      │
│         ↓ 安装成功后                                   │
│       两个目录的 APK 都可以清理（下次下载会覆盖）        │
└──────────────────────────────────────────────────────┘
```

---

## 八、完整状态流转

```
用户操作        系统行为                        UI 反馈
─────────────────────────────────────────────────────
启动 App    → 3s 后自动检查        静默（无提示）
               │
          有更新？─→ 无更新         静默
               │
               └→ 有更新
                   │
              强制更新？─→ 弹窗      "发现新版本 v1.26.0"
                   │                [立即更新] (不可取消)
                   │
                   └→ 可选更新       "发现新版本 v1.26.0"
                                    [立即更新] [稍后]
                       │
                  点击 [立即更新]
                       │
                       ▼
                  开始下载             "开始下载更新..."
                       │
                  下载中               "下载中 45%  18.5MB/42.5MB"
                       │
                  下载完成 ✓           "下载完成，建议立即安装"
                                      [立即安装] [稍后]
                       │
                  点击 [立即安装]
                       │
                       ▼
                  MD5 校验             "正在校验文件完整性..."
                       │
                  校验通过 ✓
                       │
                  空间检查 ✓
                       │
                  权限检查 ✓
                       │
                  方案0 ROOT          "正在安装新版本..."
                  方案1 FileProvider   "系统安装界面已弹出"
                  方案2 公共目录       "系统安装界面已弹出"
                  方案3 HBuilder
                  方案4 文件管理器
                  方案5 手动安装       "请用文件管理器打开..."
```

---

## 九、容错与边界处理

| 场景 | 处理方式 |
|------|----------|
| 网络不可用 | 静默跳过，不报错 |
| 下载超时 (120s) | 提示"下载失败，请重试" |
| 文件大小 < 1MB | 判定下载不完整，提示重试 |
| MD5 不匹配 | 弹窗"下载的安装包可能已损坏，是否重新下载？" |
| 存储空间不足 | 提示"存储空间不足，请清理后重试" |
| APK 文件丢失 (安装时) | 提示"安装包丢失，请重新下载" |
| 所有安装方案失败 | 弹窗显示文件路径，引导手动安装 |
| 并发下载 | `_downloading` 标志防止重复下载 |

---

## 十、关键文件清单

| 文件 | 职责 |
|------|------|
| `src/utils/version.js` | 版本号定义（唯一入口） |
| `src/utils/update.js` | OTA 核心逻辑（~520行） |
| `src/App.vue` | 启动时自动检测 |
| `src/pages-mobile/mine/index.vue` | 手机版手动检测按钮 |
| `src/pages/mine/index.vue` | 电视版手动检测按钮 |
| `manifest.json` | Android 权限声明 |

### 权限声明（manifest.json）

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
<uses-permission android:name="android.permission.INSTALL_PACKAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

---

## 十一、发版操作流程

```bash
# 1. 修改版本号（两处）
#    src/utils/version.js:  VERSION_NAME → 1.26.0, VERSION_CODE → 360
#    manifest.json:         versionName → 1.26.0, versionCode → 360

# 2. 构建 APK
npm run build:app-plus
xcopy dist\build\app\* <SDK路径>\www\
build_apk.bat

# 3. 计算 MD5
certutil -hashfile 星途影视_v1.26.0.apk MD5

# 4. 上传 APK 到服务器（如 GitHub Release）

# 5. 更新远程 JSON
#    修改 https://api.move.wuyaoxuexi.cn/tvbox_update.json
#    {
#      "versionCode": 360,
#      "versionName": "1.26.0",
#      "downloadUrl": "https://...",
#      "forceUpdate": false,
#      "updateLog": "...",
#      "md5": "<第3步的MD5值>"
#    }

# 6. 打完收工！已安装旧版的用户下次启动 App 即收到更新提示
```

---

## 十二、设计亮点

| 特性 | 实现 |
|------|------|
| 🛡️ **三层校验** | 文件大小 + MD5 + 存储空间，下载完整才能安装 |
| 🪜 **6 级降级** | ROOT → FileProvider → 公共目录 → HBuilder → 文件管理器 → 手动，TV 盒子兼容性全覆盖 |
| 🔕 **静默更新** | ROOT 设备完全无感升级，无需用户干预 |
| 📊 **实时进度** | 百分比 + MB 双进度展示，大文件下载不焦虑 |
| ⏱️ **频率限制** | 1 小时冷却，避免每次启动都请求 |
| 🔄 **防重复** | 下载中不允许重复点击 |
| 📴 **离线友好** | 无网络时自动跳过，不影响正常使用 |
