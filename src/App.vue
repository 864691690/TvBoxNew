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
    // P1-1: 全局请求重试拦截器（网络波动自动重试）
    this.setupRetryInterceptor()
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
page { background: #0f0f1a; color: #ffffff; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
::-webkit-scrollbar { display: none; }

/* P2-2: 页面过渡动画 */
uni-page-body {
  animation: pageFadeIn 0.3s ease;
}
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateX(30rpx); }
  to { opacity: 1; transform: translateX(0); }
}

/* P5: TV 多分辨率适配 - 基础字体增强 */
/* uni-app rpx 基准: 750rpx = 屏幕宽度，已自动等比缩放 */
/* 以下针对不同分辨率做微调，确保 TV 上阅读舒适 */

/* 720p 基准 (1280x720): 不做额外调整，rpx 已适配 */
/* 1080p Full HD (1920x1080): 提高最小字号 */
@media screen and (min-width: 1920px) {
  page {
    --font-mini: 26rpx;
    --font-small: 30rpx;
    --font-base: 34rpx;
    --font-large: 42rpx;
    --font-xl: 56rpx;
    --font-hero: 80rpx;
  }
}
/* 4K Ultra HD (3840x2160): 大幅提高字号 */
@media screen and (min-width: 3200px) {
  page {
    --font-mini: 36rpx;
    --font-small: 42rpx;
    --font-base: 48rpx;
    --font-large: 60rpx;
    --font-xl: 80rpx;
    --font-hero: 110rpx;
  }
}

/* 默认变量（720p 及以下） */
page {
  --font-mini: 22rpx;
  --font-small: 26rpx;
  --font-base: 30rpx;
  --font-large: 38rpx;
  --font-xl: 48rpx;
  --font-hero: 64rpx;
}

/* 全局最小可读字号加固 - 所有小于 22rpx 的文本在 TV 上阅读吃力 */
text {
  /* 继承父级字号，不强制覆盖 */
}

/* 全局通用卡片样式 - 减少各页面重复 */
.card {
  display: inline-block; width: 240rpx; margin-right: 30rpx; vertical-align: top; white-space: normal;
  border-radius: 16rpx; overflow: hidden; background: rgba(20,40,60,0.6);
  border: 4rpx solid transparent;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}
.card:focus { transform: scale(1.08); box-shadow: 0 0 0 4rpx #00d4ff, 0 0 30rpx rgba(0,212,255,0.6); }
.card-img { width: 240rpx; height: 340rpx; background: #1a2a3a; }
.card-title { display: block; padding: 16rpx; font-size: 30rpx; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-remark { display: block; padding: 0 16rpx 16rpx; font-size: 28rpx; color: #00d4ff; }

.card-lg {
  display: inline-block; width: 400rpx; margin-right: 30rpx; vertical-align: top; white-space: normal;
  border-radius: 16rpx; overflow: hidden; background: rgba(20,40,60,0.6); position: relative;
  border: 4rpx solid transparent;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}
.card-lg:focus { transform: scale(1.08); box-shadow: 0 0 0 4rpx #00d4ff, 0 0 30rpx rgba(0,212,255,0.6); }
.card-lg-img { width: 400rpx; height: 240rpx; background: #1a2a3a; }

/* 通用返回按钮 - 组件已提供，此为 scoped 降级兼容 */
.back-btn {
  display: flex; align-items: center; padding: 16rpx 24rpx;
  background: rgba(0,212,255,0.15); border-radius: 12rpx;
  border: 2rpx solid rgba(0,212,255,0.3);
  transition: all 0.2s ease;
}
.back-btn:focus { transform: scale(1.08); background: rgba(0,212,255,0.3); box-shadow: 0 0 20rpx rgba(0,212,255,0.5); }
.back-icon { font-size: 48rpx; color: #00d4ff; margin-right: 12rpx; }
.back-text { font-size: 28rpx; color: #00d4ff; }

</style>
