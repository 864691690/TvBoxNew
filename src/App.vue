<script>
import { checkUpdate } from "@/utils/update"
import { store } from "@/store"

export default {
  data() {
    return {}
  },
  onLaunch() {
    console.log("App Launch")
    // 初始化全局状态
    store.init()
    // 读取状态栏高度并设置 CSS 变量
    this.setupStatusBar()
    // P1-1: 全局请求重试拦截器（网络波动自动重试）
    this.setupRetryInterceptor()
    // 夜间模式跟随系统
    this.setupDarkMode()
    // 隐藏原生 tabBar，使用自定义 CustomTabbar
    uni.hideTabBar({ animation: false })
    // 网络状态监听
    uni.onNetworkStatusChange((res) => {
      if (!res.isConnected) {
        uni.showToast({ title: "网络已断开", icon: "none", duration: 2500 })
      }
    })
    // 检查网络状态，有网才检查更新
    this.checkNetworkAndUpdate()
  },
  onShow() {
    console.log("App Show")
  },
  onHide() {
    console.log("App Hide")
  },
  methods: {
    setupStatusBar() {
      // 读取状态栏高度，写入 store 和全局 CSS 变量
      try {
        const sys = uni.getSystemInfoSync()
        // statusBarHeight: 状态栏高度(px)；safeArea.top: 安全区顶部距离
        let h = sys.statusBarHeight || (sys.safeArea && sys.safeArea.top) || 0
        if (!h || h < 0) h = 24  // 兜底值
        store.setStatusBarHeight(h)
        // 写入全局 CSS 变量（rpx: 1px = 2rpx）
        const rpx = h * 2
        document.documentElement.style.setProperty('--status-bar-height', rpx + 'rpx')
        console.log('[App] statusBarHeight:', h, 'px ->', rpx, 'rpx')
      } catch (e) {
        console.error('[App] setupStatusBar fail:', e)
        store.setStatusBarHeight(24)
        document.documentElement.style.setProperty('--status-bar-height', '48rpx')
      }
    },
    checkNetworkAndUpdate() {
      // #ifdef APP-PLUS
      try {
        const main = plus.android.runtimeMainActivity()
        const ConnectivityManager = plus.android.importClass("android.net.ConnectivityManager")
        const cm = main.getSystemService("connectivity")
        const activeNetwork = cm.getActiveNetworkInfo()
        if (activeNetwork && activeNetwork.isConnected()) {
          setTimeout(() => { checkUpdate() }, 3000)
        } else {
          console.log("[App] 无网络，跳过更新检查")
        }
      } catch (e) {
        // 降级：直接尝试（uni-app 环境下可能无法获取 ConnectivityManager）
        setTimeout(() => { checkUpdate() }, 3000)
      }
      // #endif
      // #ifndef APP-PLUS
      setTimeout(() => { checkUpdate() }, 3000)
      // #endif
    },
    setupDarkMode() {
      // 如果用户手动设置过暗色偏好，优先使用
      const saved = this._loadDarkPref()
      if (saved !== null) {
        this._applyDark(saved)
        return
      }
      // 否则跟随系统
      this._systemDark()
    },

    _loadDarkPref() {
      try {
        const v = uni.getStorageSync('dark_mode')
        if (v === 'true') return true
        if (v === 'false') return false
      } catch (e) {}
      return null
    },

    _systemDark() {
      try {
        // #ifdef APP-PLUS
        const Configuration = plus.android.importClass('android.content.res.Configuration')
        const res = plus.android.runtimeMainActivity().getResources()
        const config = res.getConfiguration()
        const isDark = (config.uiMode & 0x0F) === 0x02
        this._applyDark(isDark)
        // 监听系统变化
        plus.android.addEventListener(plus.android.currentWebview(), 'configuration_changed', () => {
          // 仅当用户未手动设置时才跟随系统
          if (this._loadDarkPref() !== null) return
          setTimeout(() => {
            try {
              const newConfig = plus.android.runtimeMainActivity().getResources().getConfiguration()
              this._applyDark((newConfig.uiMode & 0x0F) === 0x02)
            } catch (e) {}
          }, 300)
        })
        // #endif
        // #ifndef APP-PLUS
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        this._applyDark(mq.matches)
        mq.addEventListener && mq.addEventListener('change', (e) => {
          if (this._loadDarkPref() !== null) return
          this._applyDark(e.matches)
        })
        // #endif
      } catch (e) {
        console.warn('[App] systemDark fallback:', e)
      }
    },

    _applyDark(isDark) {
      try {
        if (isDark) {
          document.documentElement.classList.add('dark')
          if (document.body) document.body.classList.add('dark')
          // uni-app app-plus 中还需要操作 page 元素
          document.querySelector('page')?.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
          if (document.body) document.body.classList.remove('dark')
          document.querySelector('page')?.classList.remove('dark')
        }
      } catch (e) {}
    },

    /**
     * 提供给外部页面调用的暗色切换方法
     * mine 页面手动切换时会调用此方法
     */
    setDarkMode(isDark) {
      this._applyDark(isDark)
      try { uni.setStorageSync('dark_mode', String(isDark)) } catch (e) {}
    },


    setupRetryInterceptor() {
      let _origRequest = uni.request
      if (_origRequest._patched) return
      uni.request = function(opts) {
        const maxRetry = opts._maxRetry || 2
        const retryDelay = opts._retryDelay || 1000
        let attempts = 0
        let lastError = null

        function doAttempt() {
          attempts++
          _origRequest({
            ...opts,
            success(res) {
              if (res.statusCode >= 500 && attempts < maxRetry) {
                // 指数退避: 1s, 2s, 4s...
                setTimeout(doAttempt, retryDelay * Math.pow(2, attempts - 1))
              } else {
                opts.success && opts.success(res)
                opts.complete && opts.complete(res)
              }
            },
            fail(err) {
              lastError = err
              if (attempts < maxRetry) {
                setTimeout(doAttempt, retryDelay * Math.pow(2, attempts - 1))
              } else {
                opts.fail && opts.fail(err)
                opts.complete && opts.complete(err)
              }
            }
          })
        }
        doAttempt()
      }
      uni.request._patched = true
    }
  }
}
</script>

<style>
page { background: var(--bg-page); color: var(--text-primary); font-family: sans-serif; }
::-webkit-scrollbar { display: none; }

/* 夜间模式过渡 */
page, page.dark * {
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* 通用暗色覆盖 */
page.dark .page { background: var(--bg-page) !important; }
page.dark .card,
page.dark .hero-section,
page.dark .top-bar,
page.dark .bottom-panel,
page.dark .panel-drawer,
page.dark .resume-card,
page.dark .filter-tag,
page.dark .route-chip,
page.dark .ep-item,
page.dark .ep-group-header,
page.dark .h-card,
page.dark .quick-row { background: var(--bg-card) !important; }

page.dark .title,
page.dark .section-title,
page.dark .card-name,
page.dark .hero-info .title,
page.dark .top-title,
page.dark .quick-text,
page.dark .resume-title,
page.dark .panel-title { color: var(--text-primary) !important; }

page.dark .meta-item,
page.dark .desc-text,
page.dark .score-source,
page.dark .card-sub,
page.dark .h-sub,
page.dark .quick-text,
page.dark .resume-sub { color: var(--text-secondary) !important; }

/* 页面过渡动画 */
uni-page-body {
  animation: pageFadeIn 0.25s ease;
}
@keyframes pageFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* SVG icon global styles */
.icon { vertical-align: middle; flex-shrink: 0; display: inline-block; }
.green-dot { vertical-align: middle; }
.heart-icon, .heart-icon-outline { vertical-align: middle; display: inline-block; }
</style>
