<template>
  <view class="page">
    <!-- 返回按钮 -->
    <view class="top-bar">
      <BackButton />
      <text class="page-title">个人中心</text>
    </view>

    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="avatar">
        <text class="avatar-text">👤</text>
      </view>
      <view class="user-info">
        <text class="user-name">星途TV用户</text>
        <text class="user-desc">观看{{ historyList.length }}部 · 收藏{{ collectList.length }}部</text>
      </view>
    </view>

    <!-- 继续观看 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">▶ 继续观看</text>
        <view class="header-actions">
          <view class="sort-btn" @click="toggleHistorySort" :focusable="true" v-if="historyList.length">
            <text>{{ historySortText }}</text>
          </view>
          <view class="action-btn" @click="clearHistory" :focusable="true" v-if="historyList.length">
            <text>清空</text>
          </view>
        </view>
      </view>
      <scroll-view scroll-x class="h-scroll" v-if="historyList.length" :focusable="false">
        <view v-for="item in historyList" :key="item.vod_id + '_' + item.episode" class="history-card" :focusable="true" @click="goPlay(item)">
          <image class="history-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load />
          <view class="history-info">
            <text class="history-title">{{ item.vod_name }}</text>
            <text class="history-ep">第{{ (item.episode || 0) + 1 }}集</text>
            <view class="progress-bar">
              <view class="progress-fill" :style="{ width: (item.duration > 0 ? Math.min(100, item.progress / item.duration * 100) : 0) + '%' }"></view>
            </view>
            <text class="history-time">{{ formatTime(item.progress) }} / {{ formatTime(item.duration) }}</text>
          </view>
          <view class="play-btn">
            <text>续播</text>
          </view>
        </view>
      </scroll-view>
      <view class="empty-text" v-else><text>暂无观看记录</text></view>
    </view>

    <!-- 我的收藏 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">★ 我的收藏</text>
        <view class="action-btn" @click="clearCollects" :focusable="true" v-if="collectList.length">
          <text>清空</text>
        </view>
      </view>
      <scroll-view scroll-x class="h-scroll" v-if="collectList.length" :focusable="false">
        <view v-for="item in collectList" :key="item.vod_id" class="card" :focusable="true" @click="goDetail(item.vod_id)">
          <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load />
          <text class="card-title">{{ item.vod_name }}</text>
          <text class="card-remark" v-if="item.vod_remarks">{{ item.vod_remarks }}</text>
        </view>
      </scroll-view>
      <view class="empty-text" v-else><text>暂无收藏</text></view>
    </view>

    <!-- 我的追剧 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">📺 我的追剧</text>
      </view>
      <scroll-view scroll-x class="h-scroll" v-if="followList.length" :focusable="false">
        <view v-for="item in followList" :key="item.vod_id" class="card follow-card" :focusable="true" @click="goDetail(item.vod_id)">
          <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load />
          <text class="card-title">{{ item.vod_name }}</text>
          <view class="update-badge" v-if="item.newEp">
            <text>更新{{ item.newEp }}集</text>
          </view>
        </view>
      </scroll-view>
      <view class="empty-text" v-else><text>暂无追剧</text></view>
    </view>

    <!-- 设置 -->
    <view class="settings-section">
      <text class="section-title">⚙ 系统设置</text>
      <view class="settings-list">
        <view class="setting-item" :focusable="true" @click="setDefaultQuality">
          <text class="setting-label">默认清晰度</text>
          <text class="setting-value">{{ qualityText }}</text>
          <text class="setting-arrow">></text>
        </view>
        <view class="setting-item" :focusable="true" @click="clearCache">
          <text class="setting-label">清除缓存</text>
          <text class="setting-value">{{ cacheSize }}</text>
          <text class="setting-arrow">></text>
        </view>
        <view class="setting-item" :focusable="true" @click="setSubtitle">
          <text class="setting-label">字幕显示</text>
          <text class="setting-value">{{ subtitleText }}</text>
          <text class="setting-arrow">></text>
        </view>
        <view class="setting-item" :focusable="true">
          <text class="setting-label">当前版本</text>
          <text class="setting-value">v{{ version }}</text>
        </view>
        <view class="setting-item" :focusable="true" @click="aboutApp">
          <text class="setting-label">关于星途TV</text>
          <text class="setting-arrow">></text>
        </view>
        <view class="setting-item" :focusable="true" @click="checkAppUpdate">
          <text class="setting-label">检查更新</text>
          <text class="setting-value">v{{ version }}</text>
          <text class="setting-arrow">></text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { DEFAULT_PIC, BASE_URL, fixPicUrl, API } from "@/api/config"
import { autoFocus } from "@/utils/focus"
import { checkUpdate } from "@/utils/update"
import { formatTime } from "@/utils/format"
import BackButton from "@/components/BackButton.vue"

const VERSION_NAME = "1.23.0"

export default {
  components: { BackButton },
  data() {
    return {
      version: VERSION_NAME,
      defaultPic: DEFAULT_PIC,
      historyList: [],
      historySortBy: "time", // "time" | "name"
      collectList: [],
      followList: [],
      qualityText: "高清",
      cacheSize: "0MB",
      subtitleText: "关闭",
    }
  },
  computed: {
    historySortText() {
      return this.historySortBy === "time" ? "时间 ↓" : "名称 A-Z"
    }
  },
  onShow() {
    this.loadData()
    this.loadSettings()
    this.calcCacheSize()
    // 恢复排序偏好
    try { this.historySortBy = uni.getStorageSync("_history_sort") || "time" } catch (e) {}
  },
  onReady() {
    this.$nextTick(() => autoFocus(this.$el))
  },
  methods: {
    loadData() {
      this.loadHistory()
      this.loadCollects()
      this.loadFollows()
    },
    loadHistory() {
      try {
        let list = (uni.getStorageSync("play_history") || []).map(h => ({
          ...h,
          vod_pic: this.fixPicUrl(h.vod_pic || ""),
          _sortTime: h.time || h.timestamp || 0
        }))
        this.sortHistory(list)
      } catch (e) { this.historyList = [] }
    },
    toggleHistorySort() {
      this.historySortBy = this.historySortBy === "time" ? "name" : "time"
      this.sortHistory(this.historyList)
      uni.setStorageSync("_history_sort", this.historySortBy)
    },
    sortHistory(list) {
      if (this.historySortBy === "name") {
        list.sort((a, b) => (a.vod_name || "").localeCompare(b.vod_name || "", "zh"))
      } else {
        list.sort((a, b) => (b._sortTime || 0) - (a._sortTime || 0))
      }
      this.historyList = list
    },
    loadCollects() {
      try {
        this.collectList = (uni.getStorageSync("my_collects") || []).map(c => ({
          ...c,
          vod_pic: this.fixPicUrl(c.vod_pic || "")
        }))
      } catch (e) { this.collectList = [] }
    },
    loadFollows() {
      try {
        this.followList = (uni.getStorageSync("my_follows") || []).map(f => ({
          ...f,
          vod_pic: this.fixPicUrl(f.vod_pic || ""),
          _oldTotalEp: f.totalEp || 0
        }))
        // 异步批量检测追剧更新
        this.checkFollowUpdates()
      } catch (e) { this.followList = [] }
    },
    async checkFollowUpdates() {
      if (this.followList.length === 0) return
      // 并发请求，每次3个
      const MAX_CONCURRENT = 3
      const items = [...this.followList]
      const results = []
      for (let i = 0; i < items.length; i += MAX_CONCURRENT) {
        const batch = items.slice(i, i + MAX_CONCURRENT)
        const batchResults = await Promise.allSettled(
          batch.map(item => this.fetchDetailForFollow(item))
        )
        results.push(...batchResults)
      }
      // 批量更新存储
      let follows = uni.getStorageSync("my_follows") || []
      let changed = false
      for (let j = 0; j < this.followList.length; j++) {
        const r = results[j]
        if (r.status === "fulfilled" && r.value > 0) {
          const item = this.followList[j]
          item.newEp = r.value
          const idx = follows.findIndex(f => f.vod_id === item.vod_id)
          if (idx >= 0) {
            follows[idx].totalEp = item.totalEp
            follows[idx].newEp = r.value
            changed = true
          }
        }
      }
      if (changed) uni.setStorageSync("my_follows", follows)
    },
    fetchDetailForFollow(item) {
      return new Promise((resolve) => {
        uni.request({
          url: API.detail(item.vod_id),
          method: "GET",
          timeout: 5000,
          success: (r) => {
            const res = r.data
            if (res && res.list && res.list.length > 0) {
              const detail = res.list[0]
              const playUrl = detail.vod_play_url || ""
              const routeUrl = playUrl.split("$$$")[0] || ""
              const currentEp = routeUrl.split("#").filter(e => e).length
              item.totalEp = currentEp
              resolve(item.totalEp && currentEp > item._oldTotalEp ? currentEp - item._oldTotalEp : 0)
            } else {
              resolve(0)
            }
          },
          fail: () => resolve(0)
        })
      })
    },
    fixPicUrl,
    loadSettings() {
      try {
        const quality = uni.getStorageSync("default_quality") || "high"
        const qualityMap = { high: "高清", super: "超清", blue: "蓝光" }
        this.qualityText = qualityMap[quality] || "高清"
        // P5: 字幕设置
        const subtitle = uni.getStorageSync("subtitle_enabled") || false
        this.subtitleText = subtitle ? "开启" : "关闭"
      } catch (e) {}
    },
    calcCacheSize() {
      try {
        const keys = uni.getStorageInfoSync().keys || []
        let totalSize = 0
        // 估算：每个key大约占用的字节数
        const info = uni.getStorageInfoSync()
        totalSize = (info.currentSize || 0) * 1024
        if (totalSize < 1024 * 1024) {
          this.cacheSize = (totalSize / 1024).toFixed(1) + "KB"
        } else {
          this.cacheSize = (totalSize / 1024 / 1024).toFixed(1) + "MB"
        }
      } catch (e) {
        this.cacheSize = "0MB"
      }
    },
    formatTime,
    clearHistory() {
      uni.showModal({
        title: "提示", content: "确定清空观看历史？",
        success: (res) => {
          if (res.confirm) { uni.removeStorageSync("play_history"); this.historyList = [] }
        }
      })
    },
    clearCollects() {
      uni.showModal({
        title: "提示", content: "确定清空所有收藏？",
        success: (res) => {
          if (res.confirm) { uni.removeStorageSync("my_collects"); this.collectList = [] }
        }
      })
    },
    goPlay(item) {
      uni.navigateTo({ url: `/pages/player/index?id=${item.vod_id}&ep=${item.episode || 0}&title=${encodeURIComponent(item.vod_name)}` })
    },
    goDetail(id) { uni.navigateTo({ url: `/pages/detail/index?id=${id}` }) },
    setDefaultQuality() {
      const items = ["高清", "超清", "蓝光"]
      uni.showActionSheet({
        itemList: items,
        success: (res) => {
          this.qualityText = items[res.tapIndex]
          const qualityMap = { 0: "high", 1: "super", 2: "blue" }
          uni.setStorageSync("default_quality", qualityMap[res.tapIndex])
        }
      })
    },
    clearCache() {
      uni.showModal({
        title: "提示", content: "确定清除缓存？观看历史和收藏不会被清除。",
        success: (res) => {
          if (res.confirm) {
            // 保留关键数据
            const history = uni.getStorageSync("play_history")
            const collects = uni.getStorageSync("my_collects")
            const follows = uni.getStorageSync("my_follows")
            const quality = uni.getStorageSync("default_quality")
            const searchHistory = uni.getStorageSync("search_history")
            uni.clearStorageSync()
            // 恢复
            if (history) uni.setStorageSync("play_history", history)
            if (collects) uni.setStorageSync("my_collects", collects)
            if (follows) uni.setStorageSync("my_follows", follows)
            if (quality) uni.setStorageSync("default_quality", quality)
            if (searchHistory) uni.setStorageSync("search_history", searchHistory)
            this.cacheSize = "0MB"
            uni.showToast({ title: "缓存已清除", icon: "success" })
          }
        }
      })
    },
    aboutApp() {
      uni.navigateTo({ url: "/pages/about/index" })
    },
    setSubtitle() {
      const items = ["开启", "关闭"]
      uni.showActionSheet({
        itemList: items,
        success: (res) => {
          this.subtitleText = items[res.tapIndex]
          uni.setStorageSync("subtitle_enabled", res.tapIndex === 0)
        }
      })
    },
    checkAppUpdate() {
      checkUpdate(true) // 手动检查，无更新也提示
    }
  }
}
</script>

<style scoped>
.page { background: linear-gradient(180deg, #0a1628 0%, #0f1a2a 100%); min-height: 100vh; padding: 60rpx; }
.top-bar { display: flex; align-items: center; margin-bottom: 40rpx; }
.back-btn { display: flex; align-items: center; padding: 16rpx 24rpx; background: rgba(0,212,255,0.15); border-radius: 12rpx; border: 2rpx solid rgba(0,212,255,0.3); margin-right: 30rpx; transition: all 0.2s ease; }
.back-btn:focus { transform: scale(1.08); background: rgba(0,212,255,0.3); box-shadow: 0 0 20rpx rgba(0,212,255,0.5); }
.back-icon { font-size: 48rpx; color: #00d4ff; margin-right: 12rpx; }
.back-text { font-size: 28rpx; color: #00d4ff; }
.page-title { font-size: 48rpx; font-weight: bold; color: #fff; }
.line-clamp { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 用户卡片 */
.user-card {
  display: flex; align-items: center; padding: 40rpx; margin-bottom: 50rpx;
  background: rgba(0,212,255,0.08); border-radius: 24rpx; border: 1rpx solid rgba(0,212,255,0.15);
}
.avatar {
  width: 120rpx; height: 120rpx; border-radius: 50%; background: rgba(0,212,255,0.2);
  display: flex; justify-content: center; align-items: center; margin-right: 40rpx;
}
.avatar-text { font-size: 60rpx; }
.user-info { flex: 1; }
.user-name { display: block; font-size: 36rpx; font-weight: bold; color: #fff; margin-bottom: 12rpx; }
.user-desc { font-size: 26rpx; color: #8aa; }

/* 区块 */
.section { margin-bottom: 60rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30rpx; }
.section-title { font-size: 36rpx; font-weight: bold; color: #fff; }
.header-actions { display: flex; gap: 16rpx; align-items: center; }
.sort-btn { padding: 12rpx 24rpx; background: rgba(0,212,255,0.15); border-radius: 8rpx; transition: all 0.2s ease; }
.sort-btn:focus { background: rgba(0,212,255,0.3); transform: scale(1.05); }
.sort-btn text { font-size: 26rpx; color: #00d4ff; }
.action-btn { padding: 12rpx 24rpx; background: rgba(255,100,100,0.15); border-radius: 8rpx; }
.action-btn text { font-size: 26rpx; color: #f66; }
.empty-text { text-align: center; padding: 40rpx 0; color: #666; font-size: 28rpx; }
.h-scroll { white-space: nowrap; }

/* 历史卡片 */
.history-card {
  display: inline-flex; width: 520rpx; background: rgba(20,40,60,0.6);
  border-radius: 16rpx; overflow: hidden; margin-right: 30rpx;
  border: 2rpx solid transparent;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}
.history-card:focus { transform: scale(1.05); box-shadow: 0 0 0 2rpx #00d4ff, 0 0 30rpx rgba(0,212,255,0.5); }
.history-img { width: 240rpx; height: 180rpx; background: #1a2a3a; flex-shrink: 0; }
.history-info { flex: 1; padding: 16rpx 20rpx; display: flex; flex-direction: column; justify-content: space-between; }
.history-title { font-size: 28rpx; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-ep { font-size: 24rpx; color: #00d4ff; margin-top: 6rpx; }
.progress-bar { height: 6rpx; background: rgba(255,255,255,0.2); border-radius: 3rpx; overflow: hidden; margin-top: 8rpx; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #00d4ff, #00ff88); }
.history-time { font-size: 24rpx; color: #666; margin-top: 6rpx; }
.play-btn {
  align-self: center; padding: 16rpx 24rpx;
  background: linear-gradient(135deg, #00d4ff, #00a8ff); border-radius: 10rpx; margin-right: 16rpx; flex-shrink: 0;
}
.play-btn text { font-size: 24rpx; color: #fff; }

/* 标准卡片 */
.card {
  display: inline-block; width: 240rpx; background: rgba(20,40,60,0.6);
  border-radius: 16rpx; overflow: hidden; margin-right: 30rpx; border: 3rpx solid transparent;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}
.card:focus { transform: scale(1.08); box-shadow: 0 0 0 3rpx #00d4ff, 0 0 30rpx rgba(0,212,255,0.6); }
.card-img { width: 240rpx; height: 340rpx; background: #1a2a3a; }
.card-title { display: block; padding: 16rpx; font-size: 30rpx; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-remark { display: block; padding: 0 16rpx 16rpx; font-size: 28rpx; color: #00d4ff; }

/* 追剧卡片 */
.follow-card { position: relative; }
.update-badge { position: absolute; top: 12rpx; right: 12rpx; padding: 6rpx 14rpx; background: linear-gradient(135deg, #ff6b35, #ff4757); border-radius: 8rpx; }
.update-badge text { font-size: 24rpx; color: #fff; }

/* 设置 */
.settings-section { margin-top: 40rpx; }
.settings-list { background: rgba(20,40,60,0.6); border-radius: 16rpx; overflow: hidden; }
.setting-item {
  display: flex; align-items: center; padding: 30rpx 40rpx;
  border-bottom: 1rpx solid rgba(255,255,255,0.05); transition: all 0.2s ease;
}
.setting-item:last-child { border-bottom: none; }
.setting-item:focus { background: rgba(0,212,255,0.1); }
.setting-label { flex: 1; font-size: 30rpx; color: #fff; }
.setting-value { font-size: 28rpx; color: #aaa; margin-right: 20rpx; }
.setting-arrow { font-size: 28rpx; color: #666; }
</style>
