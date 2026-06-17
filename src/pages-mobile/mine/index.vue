<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="top-bar">
      <!-- 左侧：头像 + 用户信息 -->
      <view class="user-info-left">
        <image class="avatar" :src="defaultAvatar" mode="aspectFill" />
        <view class="user-text">
          <text class="user-name">极速影迷</text>
          <text class="user-id">ID: 381437442</text>
        </view>
      </view>
      <!-- 右侧：主题 + 设置 + 登录按钮 -->
      <view class="top-right">
        <image class="top-icon-img" :src="isDark ? sunIcon : moonIcon" mode="aspectFit" @click="toggleDark" />
        <image class="top-icon-img" :src="settingsIcon" mode="aspectFit" @click="goAbout" />
        <text class="login-btn" @click="login">登录/注册</text>
      </view>
    </view>

    <!-- 顶部状态栏占位 -->
    <view class="status-bar"></view>

    <!-- Tab 一级导航 -->
    <view class="tab-bar">
      <view
        v-for="(tab, i) in tabs"
        :key="i"
        :class="['tab-item', currentTab === i ? 'active' : '']"
        @click="currentTab = i"
      >
        <text>{{ tab }}</text>
        <view class="tab-line" v-if="currentTab === i"></view>
      </view>
      <view class="tab-right">
        <text class="edit-btn">编辑</text>
      </view>
    </view>

    <!-- 观看历史 Tab 内容 -->
    <scroll-view v-if="currentTab === 0" scroll-y class="content-scroll">
      <!-- 筛选标签（仅历史Tab） -->
      <view class="filter-row">
        <view
          v-for="(s, i) in historyFilters"
          :key="i"
          :class="['filter-btn', historyFilter === i ? 'active' : '']"
          @click="historyFilter = i"
        >
          <text>{{ s }}</text>
        </view>
      </view>

      <!-- 历史网格 -->
      <view class="card-grid" v-if="filteredHistory.length">
        <view v-for="item in filteredHistory" :key="item.vod_id + '_' + item.episode" class="card" @click="goPlay(item)">
          <view class="card-img-wrap">
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load @error="(e) => onImgError(e, item)" />
            <view class="card-progress" v-if="progressPct(item) < 95">
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: progressPct(item) + '%' }"></view>
              </view>
            </view>
            <view class="card-tag" v-else>已看完</view>
          </view>
          <text class="card-name">{{ item.vod_name }}</text>
          <text class="card-sub">{{ getHistorySub(item) }}</text>
        </view>
      </view>
      <view class="empty-text" v-else>
        <text>暂无观看记录</text>
      </view>
      <view class="safe-bottom"></view>
    </scroll-view>

    <!-- 我的收藏 Tab 内容 -->
    <scroll-view v-if="currentTab === 1" scroll-y class="content-scroll">
      <view class="card-grid" v-if="collectList.length">
        <view v-for="item in collectList" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
          <view class="card-img-wrap">
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load @error="(e) => onImgError(e, item)" />
          </view>
          <text class="card-name">{{ item.vod_name }}</text>
        </view>
      </view>
      <view class="empty-text" v-else>
        <text>暂无收藏</text>
      </view>
      <view class="safe-bottom"></view>
    </scroll-view>

    <!-- 下载缓存 Tab 内容 -->
    <scroll-view v-if="currentTab === 2" scroll-y class="content-scroll">
      <view class="empty-text">
        <text>暂无下载内容</text>
      </view>
      <view class="safe-bottom"></view>
    </scroll-view>
  </view>
</template>

<script>
import { DEFAULT_PIC, fixPicUrl } from "@/api/config"
import { store } from "@/store"

export default {
  data() {
    return {
      defaultPic: DEFAULT_PIC,
      defaultAvatar: "https://pic.rmb.bdstatic.com/bjh/user/5ea35b8c5e9f3f9c3c7e8b5d8e7f6a5b4.png",
      isDark: false,
      moonIcon: "https://cdn.jsdelivr.net/npm/feather-icons@4.29.2/dist/icons/moon.svg",
      sunIcon: "https://cdn.jsdelivr.net/npm/feather-icons@4.29.2/dist/icons/sun.svg",
      settingsIcon: "https://cdn.jsdelivr.net/npm/feather-icons@4.29.2/dist/icons/settings.svg",
      tabs: ['观看历史', '我的收藏', '下载缓存'],
      currentTab: 0,
      historyFilters: ['全部', '未看完', '已看完'],
      historyFilter: 0,
      historyList: [],
      collectList: [],
    }
  },
  computed: {
    filteredHistory() {
      if (this.historyFilter === 0) return this.historyList
      if (this.historyFilter === 1) return this.historyList.filter(h => this.progressPct(h) < 95)
      return this.historyList.filter(h => this.progressPct(h) >= 95)
    }
  },
  onShow() {
    console.log('[mine] onShow 触发')
    this.loadData()
    this.loadDarkPref()
  },
  mounted() {
    console.log('[mine] mounted 触发')
    this.loadData()
    this.loadDarkPref()
  },
  methods: {
    loadData() {
      this.loadHistory()
      this.loadCollects()
    },
    loadHistory() {
      try {
        const raw = uni.getStorageSync('play_history')
        console.log('[loadHistory] play_history raw:', JSON.stringify(raw))
        this.historyList = (Array.isArray(raw) ? raw : []).map(h => ({
          ...h, vod_pic: fixPicUrl(h.vod_pic || "")
        })).sort((a, b) => (b.time || 0) - (a.time || 0))
        console.log('[loadHistory] historyList count:', this.historyList.length)
      } catch (e) { this.historyList = []; console.log('[loadHistory] error:', e) }
    },
    loadCollects() {
      try {
        this.collectList = store.state.collects.map(c => ({ ...c, vod_pic: fixPicUrl(c.vod_pic || "") }))
      } catch (e) { this.collectList = [] }
    },
    loadDarkPref() {
      try { this.isDark = uni.getStorageSync('dark_mode') === 'true' } catch (e) {}
    },
    progressPct(item) {
      return item.duration > 0 ? Math.min(100, item.progress / item.duration * 100) : 0
    },
    getHistorySub(item) {
      const pct = this.progressPct(item)
      if (pct >= 95) return '已看完'
      return `第${(item.episode || 0) + 1}集 ${Math.round(pct)}%`
    },
    onImgError(e, item) { e.target.src = this.defaultPic },
    goPlay(item) {
      uni.navigateTo({ url: `/pages-mobile/player/index?id=${item.vod_id}&ep=${item.episode || 0}&title=${encodeURIComponent(item.vod_name)}` })
    },
    goDetail(id) { uni.navigateTo({ url: `/pages-mobile/detail/index?id=${id}` }) },
    goAbout() { uni.navigateTo({ url: '/pages-mobile/about/index' }) },
    toggleDark() {
      this.isDark = !this.isDark
      const app = getApp()
      if (app && app.$vm && app.$vm.setDarkMode) {
        app.$vm.setDarkMode(this.isDark)
      } else {
        if (this.isDark) {
          document.documentElement.classList.add('dark')
          document.querySelector('page')?.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
          document.querySelector('page')?.classList.remove('dark')
        }
        try { uni.setStorageSync('dark_mode', String(this.isDark)) } catch (e) {}
      }
    },
    login() { uni.showToast({ title: '登录功能开发中', icon: 'none' }) },
  }
}
</script>

<style scoped>
/* 顶部导航栏 */
.top-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24rpx 32rpx;
  background: var(--bg-page);
}
.user-info-left {
  display: flex; align-items: center;
}
.avatar {
  width: 96rpx; height: 96rpx; border-radius: 50%;
  background: #e0e0e0; margin-right: 20rpx; flex-shrink: 0;
}
.user-text { display: flex; flex-direction: column; }
.user-name { font-size: 32rpx; font-weight: bold; color: var(--text-primary); margin-bottom: 4rpx; }
.user-id { font-size: 22rpx; color: var(--text-hint); }
.top-right { display: flex; align-items: center; gap: 20rpx; }
.top-icon-img { width: 44rpx; height: 44rpx; flex-shrink: 0; }
/* 深色模式下顶部图标反色（CDN的SVG是黑色线条） */
/deep/ .dark .top-icon-img,
uni-page-body.dark .top-icon-img { filter: brightness(0) invert(1); }
.login-btn {
  padding: 8rpx 24rpx;
  border: 2rpx solid #E53935;
  border-radius: 30rpx;
  font-size: 24rpx;
  color: #E53935;
}

/* 状态栏占位 */
.status-bar { height: 0; }

/* Tab 一级导航 */
.tab-bar {
  display: flex; align-items: center;
  padding: 0 32rpx;
  background: var(--bg-page);
  border-bottom: 1rpx solid var(--border-color, #f0f0f0);
}
.tab-item {
  position: relative;
  padding: 20rpx 28rpx 16rpx;
}
.tab-item text {
  font-size: 30rpx;
  color: var(--text-secondary);
  font-weight: normal;
}
.tab-item.active text {
  color: #E53935;
  font-weight: bold;
}
.tab-line {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 48rpx; height: 6rpx;
  background: #E53935; border-radius: 3rpx;
}
.tab-right {
  margin-left: auto;
  padding: 20rpx 0;
}
.edit-btn {
  font-size: 26rpx;
  color: var(--text-secondary);
}

/* 筛选标签行 */
.filter-row {
  display: flex; gap: 16rpx;
  padding: 20rpx 32rpx;
}
.filter-btn {
  padding: 10rpx 28rpx;
  border-radius: 30rpx;
  border: 2rpx solid var(--border-color, #e0e0e0);
}
.filter-btn text { font-size: 24rpx; color: var(--text-secondary); }
.filter-btn.active {
  background: #E53935;
  border-color: #E53935;
}
.filter-btn.active text { color: #fff; }

/* 内容区域 */
.content-scroll {
  height: calc(100vh - 200rpx);
}

/* 卡片网格 */
.card-grid {
  display: flex; flex-wrap: wrap;
  padding: 0 24rpx;
}
.card {
  width: calc((100% - 24rpx) / 3);
  margin-right: 12rpx; margin-bottom: 24rpx;
}
.card:nth-child(3n) { margin-right: 0; }
.card:active { opacity: 0.8; }

.card-img-wrap { position: relative; border-radius: 16rpx; overflow: hidden; }
.card-img { width: 100%; height: 280rpx; background: #e0e0e0; display: block; }
.card-progress {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 0 8rpx 8rpx;
}
.progress-bar { height: 4rpx; background: rgba(255,255,255,0.3); border-radius: 2rpx; }
.progress-fill { height: 100%; background: #E53935; border-radius: 2rpx; }
.card-tag {
  position: absolute; top: 10rpx; right: 10rpx;
  background: rgba(0,0,0,0.6);
  color: #fff; font-size: 20rpx;
  padding: 4rpx 10rpx; border-radius: 6rpx;
}

.card-name {
  display: block; margin-top: 10rpx;
  font-size: 26rpx; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  text-align: center;
}
.card-sub {
  display: block; margin-top: 4rpx;
  font-size: 22rpx; color: var(--text-hint);
  text-align: center;
}

.empty-text { text-align: center; padding: 120rpx 0; color: var(--text-hint); font-size: 26rpx; }
.safe-bottom { height: 40rpx; }
</style>