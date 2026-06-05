# 星途影视 (TV Box App) — 开发文档

> 版本：v1.24.0 · 最后更新：2026-06-05

---

## 一、项目概览

| 项目 | 说明 |
|------|------|
| 名称 | 星途影视-tv |
| AppID | `__UNI__B9F69F6` |
| 技术栈 | uni-app (Vue 3) + Vite |
| 目标平台 | Android TV / 电视盒子 |
| 数据源 | 苹果CMS V10 API |
| 构建方式 | uni-app 编译 → HBuilder-AS SDK 集成 → Gradle 打包 APK |
| 仓库大小 | ~37 文件 / ~1MB（不含 node_modules / APK / SDK） |

---

## 二、技术架构

```
┌─────────────────────────────────────────────────────┐
│                    uni-app (Vue 3)                   │
├─────────────────────────────────────────────────────┤
│  Pages                                               │
│  ├── index/       首页（导航 + 多分类 + 继续观看）    │
│  ├── player/      播放器（核心功能）                  │
│  ├── detail/      详情页（信息 + 剧集 + 收藏）        │
│  ├── search/      搜索页（T9 键盘 + 拼音候选）        │
│  ├── category/    分类筛选页                           │
│  ├── mine/        个人中心（历史/收藏/追剧/设置）      │
│  └── about/       关于页                              │
├─────────────────────────────────────────────────────┤
│  Core Modules                                        │
│  ├── store/       响应式全局状态管理                   │
│  ├── api/         CMS V10 接口封装 + 配置             │
│  ├── utils/       工具函数（更新/焦点/缓存/格式化）    │
│  ├── mixins/      剧集逻辑混入                         │
│  └── components/  公共组件（返回按钮）                 │
├─────────────────────────────────────────────────────┤
│  Native Layer (Android)                              │
│  ├── uni.request         网络请求（含重试拦截器）      │
│  ├── plus.downloader     APK 下载                    │
│  ├── plus.android        Java 桥接（安装/存储/MD5）   │
│  └── plus.runtime         应用运行时                  │
└─────────────────────────────────────────────────────┘
```

---

## 三、目录结构

```
TvBoxNew/
├── index.html                # 入口 HTML
├── manifest.json             # uni-app 应用配置
├── package.json              # 依赖与脚本
├── vite.config.js            # Vite 构建配置
├── build_apk.bat             # Gradle 编译 APK 脚本
├── build2.bat                # 备用打包脚本
│
├── src/
│   ├── main.js               # 应用入口（createApp）
│   ├── App.vue               # 根组件（启动初始化/网络监听/重试拦截器）
│   │
│   ├── pages/
│   │   ├── index/index.vue   # 首页
│   │   ├── player/index.vue  # 播放器
│   │   ├── detail/index.vue  # 详情页
│   │   ├── search/index.vue  # 搜索页
│   │   ├── category/index.vue# 分类筛选
│   │   ├── mine/index.vue    # 个人中心
│   │   └── about/index.vue   # 关于页
│   │
│   ├── api/
│   │   ├── config.js         # API 基础地址 & 图片工具
│   │   └── vod.js            # CMS V10 接口封装
│   │
│   ├── store/
│   │   └── index.js          # 全局响应式状态管理
│   │
│   ├── utils/
│   │   ├── version.js        # 版本号唯一入口
│   │   ├── update.js         # OTA 更新（下载/校验/安装）
│   │   ├── focus.js          # TV 焦点管理
│   │   ├── format.js         # 时间/日期格式化
│   │   ├── epCache.js        # 剧集数缓存
│   │   └── t9.js             # T9 输入法映射
│   │
│   ├── data/
│   │   └── pinyinMap.js      # 拼音候选词库
│   │
│   ├── mixins/
│   │   └── epMixin.js        # 剧集显示逻辑混入
│   │
│   └── components/
│       └── BackButton.vue    # 公共返回按钮
│
└── dist/                     # 构建产物（.gitignore）
```

---

## 四、页面功能详情

### 4.1 首页 (`pages/index/index.vue`)

**路由**: `/pages/index/index`

**功能**:
- 顶部导航栏：首页 / 电影 / 电视剧 / 综艺 / 动漫 / 体育 + 搜索按钮
- 继续观看卡片：展示最近 6 条播放记录
- 内容卡片（6 段）：推荐 / 新上线 / 热门电影 / 电视剧 / 综艺 / 动漫
- 每段卡片支持横向滚动浏览
- 追剧更新角标提示

**关键数据流**:
```
onShow() → loadAllSections()
  ├── loadNavTabs()        → 导航标签（默认 + 动态类型）
  ├── loadContinueWatch()  → store.state.history (最近 6 条)
  ├── loadHomeSections()   → 6 段卡片数据（并行请求）
  └── checkFollowUpdates() → store.state.follows 追剧更新数
```

**依赖 API**:
- `getVodList(tid, page)` — 获取指定分类视频列表
- `getFilteredVodList(tid, params)` — 分类筛选

---

### 4.2 播放器 (`pages/player/index.vue`)

**路由**: `/pages/player/index?vodId=xxx`

**核心功能**:
- 视频播放：`<video>` 原生组件，支持全屏
- 线路切换：多线路（如 高清/超清/蓝光）切换，含失败自动换线
- 剧集选择：选集面板（当前线路下的所有剧集）
- 进度记忆：自动保存/恢复播放进度到 store
- 线路记忆：记住用户偏好的线路
- 字幕开关：全局字幕设置
- 控制栏：返回 / 标题 / 选集 / 线路 / 字幕 / 全屏

**防死循环机制**:
```
线路切换流程：
  手动切换 → switchToRoute(i)
  ├── 更新剧集列表
  ├── 不清空 _failedRoutes
  └── 重新播放
  
  播放失败 → onError()
  ├── 记录当前线路到 _failedRoutes
  ├── 跳过已失败线路，选择下一个未失败线路
  ├── 如无可用线路 → 显示错误面板
  └── 有可用线路 → 自动切换重试
  
  播放成功 → onPlaying()
  └── 清空 _failedRoutes（表示当前线路有效）
```

**进度保存**:
- `onTimeUpdate` 事件每 10 秒触发
- 通过 `store.addHistory()` 写入（响应式内存 + 异步持久化）

---

### 4.3 详情页 (`pages/detail/index.vue`)

**路由**: `/pages/detail/index?vodId=xxx`

**功能**:
- 视频信息展示：海报 / 标题 / 评分 / 年份 / 地区 / 类型 / 简介
- 剧集列表（支持分页）
- 收藏/取消收藏
- 连续剧收藏时自动加入追剧列表
- 取消收藏时同步移除追剧
- 播放进度恢复（高亮上次观看到哪一集）

---

### 4.4 搜索页 (`pages/search/index.vue`)

**路由**: `/pages/search/index`

**功能**:
- T9 遥控器输入：数字键映射拼音字母
- 候选词提示：输入数字时显示可能的拼音候选
- 搜索历史：最多 20 条，去重
- 热搜推荐：瀑布流展示
- 搜索结果分页加载
- 键盘面板：数字 0-9 + 删除 + 清除

**T9 输入机制**:
```
遥控器按下数字键 → T9_KEYS 映射
  例: 2 → [a,b,c], 3 → [d,e,f], 23 → [ad,ae,af,bd,be,bf,...]
  └── pinyinMap 候选匹配 → 显示 3 个最匹配的拼音
```

---

### 4.5 分类筛选 (`pages/category/index.vue`)

**路由**: `/pages/category/index?typeId=xxx`

**功能**:
- 按类型筛选（电影/电视剧/综艺/动漫/体育）
- 支持年份/地区/排序等子筛选条件
- 分页加载更多

---

### 4.6 个人中心 (`pages/mine/index.vue`)

**路由**: `/pages/mine/index`

**功能模块**:
- 观看历史：列表展示，支持按时间/名称排序，批量清空，点击继续播放
- 我的收藏：列表展示，可清空
- 追剧列表：显示追剧中的连续剧，带更新角标
- 设置：
  - 默认画质选择（高清/超清/蓝光）
  - 字幕开关
  - 检测更新
  - 清除缓存（保留核心数据）
- 关于入口

---

### 4.7 关于页 (`pages/about/index.vue`)

**功能**: 显示版本号（来源 `version.js`）、版权信息

---

## 五、API 层

### 5.1 配置 (`api/config.js`)

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `BASE_URL` | `https://api.move.wuyaoxuexi.cn` | API 基础地址 |
| `DEFAULT_PIC` | 默认占位图 | 图片加载失败降级 |
| `fixPicUrl(url)` | 函数 | 自动补全相对路径图片 |

### 5.2 CMS V10 接口 (`api/vod.js`)

| 函数 | 参数 | 说明 |
|------|------|------|
| `getVodList(tid, page)` | 分类ID, 页码 | 获取视频列表（首页分段） |
| `getVodDetail(vodId)` | 视频ID | 获取详情（含剧集/线路） |
| `searchVod(keyword, page)` | 关键词, 页码 | 视频搜索 |
| `getFilteredVodList(tid, params)` | 分类ID, 筛选参数 | 分类+筛选+分页 |

**API 端点**:
- `/api.php/provide/vod?ac=videolist` — 视频列表
- `/api.php/provide/vod?ac=detail` — 视频详情
- 对应的 HTML 页面：`/vodtype/{id}.html`, `/voddetail/{id}.html`

---

## 六、全局状态管理 (`store/index.js`)

响应式 store，基于 Vue 3 `reactive`，所有页面共享。

| 状态 | 存储 Key | 说明 |
|------|----------|------|
| `history` | `play_history` | 播放历史（最多 50 条） |
| `collects` | `my_collects` | 收藏列表 |
| `follows` | `my_follows` | 追剧列表 |
| `searchHistory` | `search_history` | 搜索历史（最多 20 条） |
| `quality` | `default_quality` | 默认画质 (high/super/blue) |
| `subtitleEnabled` | `subtitle_enabled` | 字幕开关 |
| `historySort` | `_history_sort` | 历史排序偏好 (time/name) |

**提供的操作方法**:
- `store.init()` — 启动时从 Storage 恢复全部状态
- `store.addHistory(record)` — 添加播放记录（URL 自动修正为 2026 年）
- `store.getHistory(vodId)` — 按 ID 查找历史
- `store.toggleCollect(item)` — 切换收藏
- `store.isCollected(vodId)` — 判断是否收藏
- `store.toggleFollow(item)` — 切换追剧
- `store.isFollowing(vodId)` — 判断是否追剧中
- `store.addSearchHistory(keyword)` — 添加搜索历史（去重，上限 20）
- `store.setQuality(value)` / `store.getQuality()` — 画质设置
- `store.setSubtitle(bool)` / `store.getSubtitle()` — 字幕设置
- `store.setHistorySort(value)` / `store.getHistorySort()` — 排序偏好

**设计原则**: 所有数据同时存于响应式内存和 uni Storage，内存读写无需 I/O，保证 TV 盒子流畅。

---

## 七、版本管理

### 版本规则

- `versionName`: `x.y.0` 格式，每次发版小版本号 +1（如 1.23.0 → 1.24.0）
- `versionCode`: 末位 +10（如 330 → 340）

### 版本号唯一入口

文件: `src/utils/version.js`

```js
export const VERSION_NAME = "1.24.0"
export const VERSION_CODE = 340
```

引用方:
- `manifest.json` — `versionName` + `versionCode`
- `src/utils/update.js` — OTA 版本比较
- `src/pages/mine/index.vue` — 显示版本号
- `src/pages/about/index.vue` — 显示版本号

**发版流程**: 只需修改 `version.js` → `manifest.json` 两处，其他自动跟随。

### Git 版本标签

每次发版打 tag（如 `v1.24.0`），便于随时回退。

---

## 八、OTA 更新 (`utils/update.js`)

### 检查流程

```
checkUpdate()
  ├── 请求 https://api.move.wuyaoxuexi.cn/tvbox_update.json
  ├── 比较远程 versionCode vs 本地 VERSION_CODE
  ├── 有新版本 → 弹窗确认（强制更新/可选更新）
  └── 用户确认 → downloadAndInstall()
```

### 下载校验

- `plus.downloader.createDownload()` 下载 APK
- 实时进度 Toast（百分比 + MB）
- 完成后 MD5 校验完整性

### 安装策略（按优先级）

| 方案 | 方法 | 说明 |
|------|------|------|
| 0 | ROOT 静默安装 | `pm install -r -d`，需 root |
| 1 | FileProvider + ACTION_VIEW | Android 7.0+ 标准方式 |
| 1b | Uri.fromFile + ACTION_VIEW | FileProvider 降级方案 |
| 2 | 复制到公共目录 + ACTION_VIEW | 需要存储权限 |
| 3 | plus.runtime.install | HBuilder 官方 API |
| 4 | plus.runtime.openFile | 系统文件管理器 |
| 5 | 引导手动安装 | 弹出路径对话框 |

### 权限处理

- 自动检测 `REQUEST_INSTALL_PACKAGES` 权限
- 无权限时引导跳转系统设置页

---

## 九、构建与部署

### 9.1 构建流程

```
1. npm run build:app-plus     → dist/build/app/
2. 复制到 HBuilder-AS SDK 目录
3. build_apk.bat (Gradle)     → simpleDemo-release.apk
4. 重命名为 星途影视_vX.Y.Z.apk
```

### 9.2 开发环境

| 工具 | 版本 |
|------|------|
| uni-app cli | 5.07 (vue 3) |
| Vite | 5.2.8 |
| Gradle | 8.11.1 |
| JDK | 17 |
| HBuilder-AS SDK | 5.07.82603 |

### 9.3 .gitignore 策略

```
node_modules/     # 依赖包（npm install 恢复）
dist/             # 构建产物（npm run build 生成）
*.apk             # APK 安装包（每次构建生成）
tmp_apk/          # 临时打包目录
.idea/            # IDE 配置
```

**需要上传的**: 所有 `src/` 源码 + 配置文件 + 打包脚本 = ~1MB

---

## 十、关键设计决策

### 10.1 为什么用 uni-app

- Android TV 遥控器导航天然适合 uni-app 的 `<view :focusable="true">`
- HBuilder-AS SDK 提供原生 VideoPlayer 模块
- 一套代码可扩展到其他平台（H5 / 小程序）

### 10.2 为什么不用 vue-router

TV 盒子的导航特点是**线性 + 栈式**，`uni.navigateTo` / `uni.navigateBack` 更简单，无需前端路由。

### 10.3 为什么不用 Vuex/Pinia

项目状态量少（6 个 key），用 `reactive` + 函数封装即可，减少 bundle 体积。

### 10.4 为什么重试拦截器用指数退避

```
重试间隔: 1s → 2s → 4s（Math.pow(2, attempts-1)）
```
TV 盒子网络波动常见，指数退避比固定间隔更快恢复。

### 10.5 线路切换防死循环

- `_failedRoutes` 集合只在播放成功时清空
- `onError` 中跳过已失败线路后再选线
- 手动切换不清空失败记录（避免用户反复切到坏线路）

---

## 十一、待优化项

| 优先级 | 内容 | 状态 |
|--------|------|------|
| - | 首页 6 段卡片模板重复代码（~85 行）抽为组件 | 未处理 |
| - | 历史/收藏数据无服务端同步 | 纯本地 |
| - | 播放器字幕功能未实现具体渲染 | 仅开关 |
| - | 错误埋点/日志上报 | 未实现 |

---

## 十二、快速开始

```bash
# 1. 安装依赖
npm install

# 2. 开发调试（H5）
npm run dev:h5

# 3. 构建 APK 资源包
npm run build:app-plus

# 4. 复制到 SDK + 编译 APK（需配置 build_apk.bat 中的路径）
build_apk.bat

# 5. 版本号递增
#    修改 src/utils/version.js → VERSION_NAME + VERSION_CODE
#    修改 manifest.json → versionName + versionCode
#    构建后 APK 命名为 星途影视_vX.Y.Z.apk
```
