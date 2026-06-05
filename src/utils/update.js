/**
 * OTA 更新检测工具 v4
 * 
 * TV 盒子安装策略（按优先级）：
 * 0. 下载 → MD5校验 → 空间检查
 * 1. ROOT 静默安装 (pm install -r -d)
 * 2. FileProvider + ACTION_VIEW → 无需外部存储权限，Android 7.0+ 标准方式
 * 3. 复制到公共目录 + ACTION_VIEW（需要 WRITE_EXTERNAL_STORAGE）
 * 4. plus.runtime.install — HBuilder 官方 API
 * 5. plus.runtime.openFile — 系统文件管理器
 * 6. 引导用户手动安装
 */

const VERSION_CODE = 330
const VERSION_NAME = "1.23.0"

const UPDATE_CHECK_URL = "https://api.move.wuyaoxuexi.cn/tvbox_update.json"

let _lastCheckTime = 0
const CHECK_INTERVAL = 3600000
let _downloading = false
let _dtask = null

// #ifdef APP-PLUS

// ==================== 工具函数 ====================

function getPublicDownloadDir() {
  try {
    const Environment = plus.android.importClass("android.os.Environment")
    const dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
    if (dir) {
      if (!dir.exists()) dir.mkdirs()
      return dir.getAbsolutePath()
    }
  } catch (e) {
    console.warn("[Update] getExternalStoragePublicDirectory 失败:", e)
  }
  const paths = ["/sdcard/Download", "/storage/emulated/0/Download", "/mnt/sdcard/Download"]
  const File = plus.android.importClass("java.io.File")
  for (const p of paths) {
    const f = new File(p)
    if (f.exists() || f.mkdirs()) return p
  }
  return "/sdcard/Download"
}

function resolveNativePath(plusPath) {
  try {
    const converted = plus.io.convertLocalFileSystemURL(plusPath)
    if (converted) {
      const File = plus.android.importClass("java.io.File")
      if (new File(converted).exists()) return converted
    }
  } catch (_) {}
  const candidates = []
  try {
    const dataDir = "/data/data/" + plus.runtime.appid + "/files/apps/"
    candidates.push(dataDir + "__UNI__B9F69F6/_downloads/update.apk")
  } catch (_) {}
  const File = plus.android.importClass("java.io.File")
  for (const p of candidates) {
    try { if (new File(p).exists()) return p } catch (_) {}
  }
  try { return plus.io.convertLocalFileSystemURL(plusPath) || plusPath } catch (_) { return plusPath }
}

function copyToPublicDownload(srcPath) {
  try {
    const File = plus.android.importClass("java.io.File")
    const FileInputStream = plus.android.importClass("java.io.FileInputStream")
    const FileOutputStream = plus.android.importClass("java.io.FileOutputStream")
    const src = new File(srcPath)
    if (!src.exists()) { console.error("[Update] 源文件不存在:", srcPath); return null }
    const srcSize = src.length()
    const destDir = getPublicDownloadDir()
    const destFile = new File(destDir, "xingtu_update.apk")
    if (destFile.exists() && destFile.length() === srcSize) {
      console.log("[Update] 公共目录已有相同文件，跳过复制:", destFile.getAbsolutePath())
      return destFile.getAbsolutePath()
    }
    if (destFile.exists()) { const deleted = destFile.delete(); console.log("[Update] 删除旧文件:", deleted) }
    const fis = new FileInputStream(src)
    const fos = new FileOutputStream(destFile)
    const buffer = Array(8192); let len
    while ((len = fis.read(buffer)) > 0) { fos.write(buffer, 0, len) }
    fos.close(); fis.close()
    if (!destFile.exists()) { console.error("[Update] 复制后目标文件不存在！可能缺少权限"); return null }
    if (destFile.length() !== srcSize) { console.error("[Update] 复制后大小不匹配！"); destFile.delete(); return null }
    const destPath = destFile.getAbsolutePath()
    console.log("[Update] 已复制到公共目录:", destPath, "大小:", (destFile.length() / 1024 / 1024).toFixed(2), "MB ✓")
    return destPath
  } catch (e) { console.error("[Update] 复制到公共目录失败:", e); return null }
}

// ==================== 校验 ====================

function getFileMD5(filePath) {
  try {
    const File = plus.android.importClass("java.io.File")
    const FileInputStream = plus.android.importClass("java.io.FileInputStream")
    const MessageDigest = plus.android.importClass("java.security.MessageDigest")
    const file = new File(filePath)
    if (!file.exists()) return null
    const md = MessageDigest.getInstance("MD5")
    const fis = new FileInputStream(file)
    const buffer = Array(8192); let len
    while ((len = fis.read(buffer)) > 0) { md.update(buffer.slice(0, len)) }
    fis.close()
    const digest = md.digest(); let hex = ""
    for (let i = 0; i < digest.length; i++) { const b = digest[i] & 0xFF; hex += (b < 16 ? "0" : "") + b.toString(16) }
    return hex
  } catch (e) { console.error("[Update] MD5 计算失败:", e); return null }
}

function checkStorageSpace(apkSize) {
  try {
    const StatFs = plus.android.importClass("android.os.StatFs")
    const File = plus.android.importClass("java.io.File")
    const dir = new File(getPublicDownloadDir())
    if (!dir.exists()) return true
    const stat = new StatFs(dir.getAbsolutePath())
    const Build_VERSION = plus.android.importClass("android.os.Build$VERSION")
    let freeBytes = Build_VERSION.SDK_INT >= 18 ? stat.getAvailableBytes() : stat.getAvailableBlocks() * stat.getBlockSize()
    const needBytes = apkSize * 1.5
    console.log("[Update] 剩余空间:", (freeBytes / 1024 / 1024).toFixed(2), "MB, 需要:", (needBytes / 1024 / 1024).toFixed(2), "MB")
    if (freeBytes < needBytes) {
      console.error("[Update] 存储空间不足！")
      uni.showToast({ title: "存储空间不足，请清理后重试", icon: "none", duration: 3500 })
      return false
    }
    return true
  } catch (e) { console.warn("[Update] 空间检查异常:", e); return true }
}

// ==================== ROOT ====================

function hasRootAccess() {
  try {
    const Runtime = plus.android.importClass("java.lang.Runtime")
    const process = Runtime.getRuntime().exec("su")
    const os = process.getOutputStream(); os.write("exit\n".getBytes()); os.flush()
    const exitCode = process.waitFor(); os.close(); process.destroy()
    return exitCode === 0
  } catch (e) { return false }
}

function execRootCmd(cmd) {
  try {
    const Runtime = plus.android.importClass("java.lang.Runtime")
    const process = Runtime.getRuntime().exec("su")
    const os = process.getOutputStream(); os.write((cmd + "\nexit\n").getBytes()); os.flush()
    const is = process.getInputStream()
    const reader = new (plus.android.importClass("java.io.InputStreamReader"))(is)
    const br = new (plus.android.importClass("java.io.BufferedReader"))(reader)
    let line, output = ""
    while ((line = br.readLine()) !== null) { output += line + "\n" }
    br.close(); const exitCode = process.waitFor(); os.close(); process.destroy()
    console.log("[Update] ROOT 命令结果, exitCode:", exitCode, "output:", output)
    return { success: exitCode === 0, output: output }
  } catch (e) { console.error("[Update] ROOT 命令异常:", e); return { success: false, output: "" } }
}

// ==================== 安装方案 ====================

function tryRootInstall(filePath, onDone) {
  try {
    console.log("[Update] >> 方案0: ROOT 静默安装")
    if (!hasRootAccess()) { console.log("[Update] 设备无 ROOT 权限，跳过"); onDone(false); return }
    const main = plus.android.runtimeMainActivity()
    const pkgName = main.getPackageName()
    const stopResult = execRootCmd("am force-stop " + pkgName)
    console.log("[Update] force-stop 结果:", stopResult.success)
    const installCmd = "pm install -r -d " + filePath
    const result = execRootCmd(installCmd)
    console.log("[Update] pm install 结果:", JSON.stringify(result))
    if (result.success || result.output.indexOf("Success") >= 0) {
      console.log("[Update] ROOT 安装成功！启动新版本...")
      try {
        const pm = main.getPackageManager()
        const launchIntent = pm.getLaunchIntentForPackage(pkgName)
        if (launchIntent) { launchIntent.addFlags(0x10000000); main.startActivity(launchIntent) }
      } catch (e) { console.warn("[Update] 启动 APP 失败:", e) }
      onDone(true)
    } else { console.warn("[Update] pm install 失败"); onDone(false) }
  } catch (e) { console.error("[Update] ROOT 安装异常:", e); onDone(false) }
}

function tryFileProviderInstall(filePath, onDone) {
  try {
    const File = plus.android.importClass("java.io.File")
    const apkFile = new File(filePath)
    if (!apkFile.exists()) { console.error("[Update] FileProvider: 文件不存在"); onDone(false); return }
    const main = plus.android.runtimeMainActivity()
    const Intent = plus.android.importClass("android.content.Intent")
    let FileProvider
    try { FileProvider = plus.android.importClass("androidx.core.content.FileProvider") }
    catch (_) {
      try { FileProvider = plus.android.importClass("android.support.v4.content.FileProvider") }
      catch (_2) { console.warn("[Update] FileProvider 类未找到，回退到 Uri.fromFile"); tryUriFromFileInstall(filePath, onDone); return }
    }
    const authority = main.getPackageName() + ".fileprovider"
    console.log("[Update] >> 方案1: FileProvider authority:", authority)
    const uri = FileProvider.getUriForFile(main, authority, apkFile)
    console.log("[Update] FileProvider URI:", uri.toString())
    const intent = new Intent(Intent.ACTION_VIEW)
    intent.setDataAndType(uri, "application/vnd.android.package-archive")
    intent.setFlags(0x10000000 | 0x00000001)
    intent.addCategory(Intent.CATEGORY_DEFAULT)
    main.startActivity(intent)
    console.log("[Update] FileProvider: ACTION_VIEW 已启动 ✓")
    onDone(true)
  } catch (e) { console.error("[Update] FileProvider 失败:", e); tryUriFromFileInstall(filePath, onDone) }
}

function tryUriFromFileInstall(filePath, onDone) {
  try {
    console.log("[Update] >> 方案1b: ACTION_VIEW + Uri.fromFile")
    const File = plus.android.importClass("java.io.File")
    const apkFile = new File(filePath)
    if (!apkFile.exists()) { console.error("[Update] Uri.fromFile: 文件不存在:", filePath); onDone(false); return }
    const main = plus.android.runtimeMainActivity()
    const Intent = plus.android.importClass("android.content.Intent")
    const Uri = plus.android.importClass("android.net.Uri")
    const intent = new Intent(Intent.ACTION_VIEW)
    intent.setDataAndType(Uri.fromFile(apkFile), "application/vnd.android.package-archive")
    intent.setFlags(0x10000000 | 0x00000001)
    intent.addCategory(Intent.CATEGORY_DEFAULT)
    main.startActivity(intent)
    console.log("[Update] Uri.fromFile: ACTION_VIEW 已启动")
    onDone(true)
  } catch (e) { console.error("[Update] Uri.fromFile 异常:", e); onDone(false) }
}

function tryHBuilderInstall(filePath, onDone) {
  try {
    console.log("[Update] >> 方案2: plus.runtime.install")
    const File = plus.android.importClass("java.io.File")
    if (!new File(filePath).exists()) { console.error("[Update] 方案2: 文件不存在"); onDone(false); return }
    plus.runtime.install(filePath, { force: true }, () => { console.log("[Update] plus.runtime.install 回调成功"); onDone(true) }, (e) => { console.warn("[Update] plus.runtime.install 失败:", JSON.stringify(e)); onDone(false) })
  } catch (e) { console.warn("[Update] plus.runtime.install 异常:", e); onDone(false) }
}

function tryOpenFileInstall(filePath, onDone) {
  try {
    console.log("[Update] >> 方案3: plus.runtime.openFile")
    plus.runtime.openFile(filePath, {}, () => { console.log("[Update] openFile 成功"); onDone(true) }, (e) => { console.error("[Update] openFile 失败:", JSON.stringify(e)); onDone(false) })
  } catch (e) { console.error("[Update] openFile 异常:", e); onDone(false) }
}

// ==================== 主流程 ====================

function performInstall(filePath, expectedMd5) {
  console.log("[Update] ====== 开始安装流程 v4 ======")
  console.log("[Update] 输入路径:", filePath)

  setTimeout(() => {
    const File = plus.android.importClass("java.io.File")
    const apkFile = new File(filePath)

    if (!apkFile.exists()) {
      console.error("[Update] APK 文件不存在:", filePath)
      uni.showToast({ title: "安装包丢失，请重新下载", icon: "none", duration: 3000 })
      return
    }

    const apkSize = apkFile.length()
    console.log("[Update] APK 大小:", (apkSize / 1024 / 1024).toFixed(2), "MB")

    if (expectedMd5) {
      uni.showToast({ title: "正在校验文件完整性...", icon: "loading", duration: 1000 })
      const localMd5 = getFileMD5(filePath)
      console.log("[Update] 本地 MD5:", localMd5, "期望 MD5:", expectedMd5)
      if (!localMd5 || localMd5.toLowerCase() !== expectedMd5.toLowerCase()) {
        console.error("[Update] MD5 校验失败！")
        uni.showModal({
          title: "校验失败",
          content: "下载的安装包可能已损坏，是否重新下载？",
          confirmText: "重新下载",
          cancelText: "取消",
          success: (res) => {
            if (res.confirm) {
              apkFile.delete()
              uni.showToast({ title: "请重新检测更新", icon: "none", duration: 2000 })
            }
          }
        })
        return
      }
      console.log("[Update] MD5 校验通过 ✓")
    }

    if (!checkStorageSpace(apkSize)) return

    setTimeout(() => {
      requestInstallPermission(() => {
        uni.showToast({ title: "正在准备安装...", icon: "loading", duration: 1000 })

        tryRootInstall(filePath, (success0) => {
          if (success0) {
            uni.showToast({ title: "正在安装新版本...", icon: "loading", duration: 3000 })
            return
          }

          setTimeout(() => {
            tryFileProviderInstall(filePath, (success1) => {
              if (success1) {
                uni.showToast({ title: "系统安装界面已弹出，请按遥控器确认安装", icon: "none", duration: 5000 })
                return
              }

              setTimeout(() => {
                const publicPath = copyToPublicDownload(filePath)
                if (publicPath) {
                  tryUriFromFileInstall(publicPath, (success2) => {
                    if (success2) {
                      uni.showToast({ title: "系统安装界面已弹出，请按遥控器确认安装", icon: "none", duration: 5000 })
                      return
                    }
                    tryRemainingInstalls(publicPath)
                  })
                } else {
                  console.warn("[Update] 复制到公共目录失败，使用私有路径继续尝试")
                  tryRemainingInstalls(filePath)
                }
              }, 600)
            })
          }, 600)
        })
      })
    }, 400)
  }, 500)
}

function tryRemainingInstalls(installPath) {
  setTimeout(() => {
    tryHBuilderInstall(installPath, (success3) => {
      if (success3) return
      setTimeout(() => {
        tryOpenFileInstall(installPath, (success4) => {
          if (success4) return
          uni.showModal({
            title: "手动安装",
            content: "如自动安装未响应，请用文件管理器打开以下路径手动安装：\n\n" + installPath,
            showCancel: false,
            confirmText: "知道了",
            success: () => {
              uni.showToast({ title: "如仍安装失败，请尝试用U盘拷贝APK后手动安装", icon: "none", duration: 4000 })
            }
          })
        })
      }, 600)
    })
  }, 600)
}

// ==================== 权限 ====================

function hasInstallPermission() {
  try { return plus.android.runtimeMainActivity().getPackageManager().canRequestPackageInstalls() } catch (e) { return true }
}

function requestInstallPermission(onDone) {
  try {
    if (hasInstallPermission()) { onDone(); return }
    const main = plus.android.runtimeMainActivity()
    const Settings = plus.android.importClass("android.provider.Settings")
    const Intent = plus.android.importClass("android.content.Intent")
    const Uri = plus.android.importClass("android.net.Uri")
    const intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
    intent.setData(Uri.parse("package:" + main.getPackageName()))
    intent.setFlags(0x10000000)
    main.startActivity(intent)
    uni.showToast({ title: "请允许安装未知应用后返回", icon: "none", duration: 5000 })
    setTimeout(() => onDone(), 2000)
  } catch (e) { onDone() }
}

// ==================== 下载 ====================

function downloadAndInstall(url, forceUpdate, expectedMd5) {
  if (_downloading) {
    uni.showToast({ title: "正在下载中，请稍候...", icon: "none", duration: 2000 })
    return
  }
  _downloading = true

  uni.showToast({ title: "开始下载更新...", icon: "loading", duration: 2000 })

  _dtask = plus.downloader.createDownload(url, {
    filename: "_downloads/update.apk",
    timeout: 120
  }, (d, status) => {
    _downloading = false
    uni.hideToast()

    if (status === 200) {
      const rawPath = d.filename
      console.log("[Update] 下载完成, plus 路径:", rawPath)

      if (!rawPath) {
        uni.showToast({ title: "下载异常，请重试", icon: "none", duration: 3000 })
        return
      }

      const realPath = resolveNativePath(rawPath)
      console.log("[Update] 解析后路径:", realPath)

      try {
        const File = plus.android.importClass("java.io.File")
        const f = new File(realPath)
        if (!f.exists() || f.length() < 1000000) {
          console.error("[Update] 下载文件异常，大小:", f.length())
          uni.showToast({ title: "下载不完整，请重试", icon: "none", duration: 3000 })
          return
        }
      } catch (_) {}

      // 下载完成，弹出安装确认
      const content = "新版本已下载完成，建议立即安装"
      const buttons = forceUpdate
        ? { showCancel: false, confirmText: "立即安装" }
        : { confirmText: "立即安装", cancelText: "稍后" }
      
      uni.showModal({
        title: "下载完成",
        content: content,
        ...buttons,
        success: (res) => {
          if (res.confirm) { performInstall(realPath, expectedMd5) }
        }
      })

    } else {
      uni.showToast({ title: "下载失败(" + status + ")，请重试", icon: "none", duration: 3000 })
      console.error("[Update] 下载失败, status:", status)
    }
  })

  _dtask.addEventListener("statechanged", (d, status) => {
    if (status === 3) {
      // 下载中
      const downloaded = d.downloadedSize || 0
      const total = d.totalSize || 0
      if (total > 0) {
        const pct = Math.round(downloaded / total * 100)
        const dlMB = (downloaded / 1024 / 1024).toFixed(1)
        const tMB = (total / 1024 / 1024).toFixed(1)
        uni.showToast({ title: "下载中 " + pct + "%\n" + dlMB + "MB / " + tMB + "MB", icon: "loading", duration: 2000 })
      }
    }
  })

  _dtask.start()
}

// #endif

/**
 * 检查更新
 */
export async function checkUpdate(showLatest = false) {
  if (!showLatest && Date.now() - _lastCheckTime < CHECK_INTERVAL) return
  _lastCheckTime = Date.now()

  try {
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: UPDATE_CHECK_URL,
        method: "GET",
        timeout: 8000,
        success: (r) => resolve(r.data),
        fail: reject
      })
    })

    if (!res || !res.versionCode) {
      if (showLatest) {
        uni.showToast({ title: "当前已是最新版本", icon: "none", duration: 2500 })
      }
      return
    }

    const currentVersionCode = VERSION_CODE

    if (res.versionCode > currentVersionCode) {
      const content = "新版本 v" + (res.versionName || '') + "\n\n" + (res.updateLog || '暂无更新日志')
      const buttons = res.forceUpdate
        ? { showCancel: false, confirmText: "立即更新" }
        : { confirmText: "立即更新", cancelText: "稍后" }
      
      uni.showModal({
        title: "发现新版本",
        content: content,
        ...buttons,
        success: (choice) => {
          if (choice.confirm) {
            if (res.downloadUrl) {
              // #ifdef APP-PLUS
              downloadAndInstall(res.downloadUrl, !!res.forceUpdate, res.md5 || null)
              // #endif
              // #ifdef H5
              window.open(res.downloadUrl)
              // #endif
            }
          }
        }
      })
    } else if (showLatest) {
      uni.showToast({ title: "当前已是最新版本", icon: "none", duration: 2500 })
    }
  } catch (e) {
    if (showLatest) {
      uni.showToast({ title: "网络连接失败，请检查网络后重试", icon: "none", duration: 3000 })
    }
    console.log("[Update] 检查更新失败:", e)
  }
}
