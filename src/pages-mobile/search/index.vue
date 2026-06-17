<template>
  <view class="page">
    <!-- 顶部搜索栏 -->
    <view class="top-bar">
      <view class="back-btn" hover-class="back-btn--active" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="search-box">
        <view class="search-icon" v-html="searchIcon"></view>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索电影、电视剧..."
          placeholder-style="color:#999"
          confirm-type="search"
          @confirm="doSearch"
          @input="onInput"
          :focus="focusInput"
          @focus="focusInput = true"
          @blur="focusInput = false"
          adjust-position
        />
        <text class="search-btn" @click="doSearch">搜索</text>
      </view>
    </view>

    <!-- 搜索建议 -->
    <view class="suggest-section" v-if="keyword && suggestList.length && !resultList.length">
      <view v-for="item in suggestList" :key="item.vod_id" class="suggest-item" @click="goDetail(item.vod_id)">
        <text class="s-icon">{{ item.vod_name }}</text>
        <text class="s-year" v-if="item.vod_year">{{ item.vod_year }}</text>
      </view>
    </view>

    <!-- 热搜 -->
    <view class="hot-section" v-if="!keyword && hotList.length">
      <view class="sec-title" v-html="fireIcon + ' 热搜推荐'"></view>
      <view class="hot-grid">
        <view v-for="(item, i) in hotList" :key="i" class="hot-item" @click="searchHot(item)">
          <text :class="['hot-num', i < 3 ? 'top' : '']">{{ i + 1 }}</text>
          <text class="hot-text">{{ item.vod_name }}</text>
          <text class="hot-tag" v-if="item.vod_remarks">{{ item.vod_remarks }}</text>
        </view>
      </view>
    </view>

    <!-- 历史搜索 -->
    <view class="hist-section" v-if="!keyword && historyList.length">
      <view class="sec-header">
        <view class="sec-title" v-html="clockIcon + ' 历史搜索'"></view>
        <text class="clear-btn" @click="clearHistory">清空</text>
      </view>
      <view class="hist-tags">
        <view v-for="(item, i) in historyList" :key="i" class="hist-tag" @click="searchHistory(item)">
          <text>{{ item }}</text>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view class="result-section" v-if="resultList.length">
      <text class="sec-title">搜索结果 ({{ totalResults }})</text>
      <view class="card-grid">
        <view v-for="item in resultList" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
          <view class="card-img-wrap">
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load />
            <view class="card-score" v-if="item.vod_douban_score">{{ item.vod_douban_score }}</view>
          </view>
          <text class="card-name">{{ item.vod_name }}</text>
          <text class="card-sub">{{ item.vod_year || '' }} {{ item.vod_remarks || '' }}</text>
        </view>
      </view>
      <view class="load-more" v-if="hasMore && !loadingMore" @click="loadMore">
        <text>加载更多</text>
      </view>
    </view>

    <view class="empty-wrap" v-if="keyword && !loading && !resultList.length">
      <text>未找到相关内容</text>
    </view>

  </view>
</template>

<script>
import { searchVod, getVodList } from "@/api/vod"
import { DEFAULT_PIC, fixPicUrl } from "@/api/config"
import { store } from "@/store"

export default {
  data() {
    return {
      searchIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
      fireIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
      clockIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
      keyword: "", defaultPic: DEFAULT_PIC,
      focusInput: false,
      historyList: [], hotList: [], suggestList: [], resultList: [],
      totalResults: 0, resultPage: 1, hasMore: false, loading: false, loadingMore: false,
      searchTimer: null,
    }
  },
  onShow() { this.loadHistory(); this.focusInput = true },
  onLoad() { this.loadHistory(); this.loadHot() },
  methods: {
    onInput() {
      // 防抖300ms后实时搜索（减少无效请求）
      clearTimeout(this.searchTimer)
      this.suggestList = []
      if (!this.keyword.trim()) {
        this.resultList = []
        this.totalResults = 0
        return
      }
      this.searchTimer = setTimeout(() => {
        this.doSearch()
      }, 300)
    },

    loadHistory() { this.historyList = store.state.searchHistory },
    async loadHot() {
      // 用真实搜索接口（ac=detail）拉热播关键词，而非列表接口
      try {
        const keywords = ['热', '新', '电影', '剧', '动漫']
        const k = keywords[new Date().getDay() % keywords.length]
        const res = await searchVod(k, 1)
        this.hotList = (res.list || []).slice(0, 15).map(i => ({ ...i, vod_pic: fixPicUrl(i.vod_pic) }))
      } catch (e) { this.hotList = [] }
    },
    fixItem(item) { return { ...item, vod_pic: fixPicUrl(item.vod_pic) } },
    doSearch() {
      if (!this.keyword.trim()) return
      this.focusInput = false
      store.addSearchHistory(this.keyword.trim())
      this.historyList = store.state.searchHistory
      this.resultPage = 1
      this.resultList = []
      this.suggestList = []
      this.search(this.keyword.trim())
    },
    searchHot(item) { this.keyword = item.vod_name; this.focusInput = false; store.addSearchHistory(this.keyword); this.historyList = store.state.searchHistory; this.resultPage = 1; this.resultList = []; this.search(this.keyword) },
    searchHistory(kw) { this.keyword = kw; this.focusInput = false; store.addSearchHistory(kw); this.historyList = store.state.searchHistory; this.resultPage = 1; this.resultList = []; this.search(kw) },
    async search(wd) {
      this.loading = true
      try {
        const res = await searchVod(wd, this.resultPage)
        const list = (res.list || []).map(this.fixItem)
        this.resultList = this.resultPage === 1 ? list : [...this.resultList, ...list]
        this.totalResults = res.total || this.resultList.length
        this.hasMore = list.length >= 20
      } catch (e) {
        uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
      }
      this.loading = false
    },
    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true; this.resultPage++
      try {
        const res = await searchVod(this.keyword, this.resultPage)
        const list = (res.list || []).map(this.fixItem)
        this.resultList = [...this.resultList, ...list]
        this.hasMore = list.length >= 20
      } catch (e) {
        uni.showToast({ title: '加载失败，请重试', icon: 'none' })
        this.resultPage--
      }
      this.loadingMore = false
    },
    clearHistory() { store.clearSearchHistory(); this.historyList = [] },
    goDetail(id) { uni.navigateTo({ url: `/pages-mobile/detail/index?id=${id}` }) },
    goBack() {
      // 安全返回：优先 navigateBack（标准页面栈回退）
      // 若栈为空或只有自己（直接入口场景），则切 tabBar 首页
      const pages = getCurrentPages ? getCurrentPages() : []
      console.log('[search] goBack, stack length:', pages.length)
      if (pages.length > 1) {
        uni.navigateBack({ delta: 1 })
      } else {
        uni.switchTab({ url: '/pages-mobile/home/index' })
      }
    },
  }
}
</script>

<style scoped>
.page { background: #F5F5F5; min-height: 100vh; padding-bottom: 120rpx; }

.top-bar {
  padding: 16rpx 32rpx;
  padding-top: calc(30rpx + var(--status-bar-height, 48rpx));
  background: #fff;
  display: flex; align-items: center; gap: 16rpx;
}
.back-btn {
  width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.back-btn:active { opacity: 0.6; }
.back-icon { font-size: 56rpx; color: #333; line-height: 1; font-weight: 300; }
.search-box {
  flex: 1; display: flex; align-items: center; gap: 16rpx;
  background: #F5F5F5; border-radius: 32rpx;
  padding: 14rpx 24rpx;
}
.search-icon { font-size: 24rpx; color: #999; }
.search-input {
  flex: 1; font-size: 28rpx; color: #333; height: 44rpx;
}
.search-btn { font-size: 28rpx; color: #E53935; font-weight: bold; }

.suggest-section { padding: 0 32rpx; background: #fff; }
.suggest-item { display: flex; align-items: center; padding: 24rpx 16rpx; border-bottom: 1rpx solid #f0f0f0; }
.suggest-item:active { background: #f5f5f5; }
.s-icon { flex: 1; font-size: 28rpx; color: #333; }
.s-year { font-size: 24rpx; color: #999; }

.hot-section, .hist-section, .result-section { padding: 20rpx 32rpx; }
.sec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.sec-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 12rpx; display: block; }
.clear-btn { font-size: 24rpx; color: #E53935; }
.hot-grid { display: flex; flex-wrap: wrap; gap: 10rpx; }
.hot-item { display: flex; align-items: center; padding: 14rpx 20rpx; background: #fff; border-radius: 16rpx; }
.hot-item:active { background: #f0f0f0; }
.hot-num { font-size: 24rpx; color: #999; margin-right: 8rpx; min-width: 30rpx; }
.hot-num.top { color: #E53935; font-weight: bold; }
.hot-text { font-size: 26rpx; color: #333; }
.hot-tag { font-size: 22rpx; color: #E53935; margin-left: 8rpx; }

.hist-tags { display: flex; flex-wrap: wrap; gap: 10rpx; }
.hist-tag { padding: 10rpx 24rpx; background: #fff; border-radius: 16rpx; }
.hist-tag text { font-size: 24rpx; color: #666; }
.hist-tag:active { background: #f0f0f0; }

/* 搜索结果 3列 */
.card-grid { display: flex; flex-wrap: wrap; }
.card {
  width: calc((100% - 24rpx) / 3);
  margin-right: 12rpx; margin-bottom: 20rpx;
}
.card:nth-child(3n) { margin-right: 0; }
.card:active { opacity: 0.8; }

.card-img-wrap { position: relative; border-radius: 12rpx; overflow: hidden; }
.card-img { width: 100%; height: 280rpx; background: #e0e0e0; display: block; }
.card-score {
  position: absolute; bottom: 8rpx; right: 8rpx;
  padding: 4rpx 10rpx; background: rgba(0,0,0,0.6);
  border-radius: 8rpx; font-size: 22rpx; color: #FFD700; font-weight: bold;
}
.card-name {
  display: block; margin-top: 10rpx;
  font-size: 26rpx; color: #333;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.card-sub { display: block; margin-top: 4rpx; font-size: 22rpx; color: #999; }

.load-more { text-align: center; padding: 30rpx 0; }
.load-more text { color: #E53935; font-size: 26rpx; }
.empty-wrap { text-align: center; padding: 100rpx 0; }
.empty-wrap text { color: #999; font-size: 28rpx; }
</style>
