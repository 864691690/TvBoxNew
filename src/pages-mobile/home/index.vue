<template>
  <view class="page">
    <!-- 品牌闪屏 -->
    <view :class="['splash-overlay', splashVisible ? '' : 'fade-out']" v-if="splashVisible || splashFading">
      <view class="splash-logo" v-html="playSvg"></view>
      <text class="splash-name">星途影视</text>
      <text class="splash-slogan">精彩视界 随心所遇</text>
    </view>

    <!-- 顶部固定区：top-bar + cat-scroll 一起 -->
    <view class="header-fixed">
      <!-- 顶部搜索栏 -->
      <view class="top-bar">
        <view class="logo-box">
          <view class="logo-icon" v-html="playSvg"></view>
          <text class="logo-text">星途影视</text>
        </view>
        <view class="search-box" @click="goSearch">
          <view class="search-icon" v-html="searchSvg"></view>
          <text class="search-placeholder">搜索电影、剧集...</text>
          <text class="search-filter">筛选</text>
        </view>
      </view>

      <!-- 分类Tab -->
      <scroll-view scroll-x class="cat-scroll" :show-scrollbar="false">
        <view
          v-for="(cat, i) in catTabs"
          :key="i"
          :class="['cat-tab', activeCat === i ? 'active' : '']"
          @click="switchCat(i)"
        >
          <text>{{ cat }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 内容滚动区 -->
    <scroll-view
      scroll-y
      class="page-scroll"
      @scrolltolower="loadMore"
      refresher-enabled
      @refresherrefresh="onRefresh"
      :refresher-triggered="refreshing"
    >
      <!-- 轮播Banner -->
      <!-- 轮播Banner -->
      <swiper class="banner-swiper" v-if="bannerList.length" :autoplay="true" :interval="4000" :circular="true" indicator-dots indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#E53935">
        <swiper-item v-for="(item, i) in bannerList" :key="i" @click="goDetail(item.vod_id)">
          <image class="banner-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load @error="onPicError(item)" />
          <view class="banner-mask"></view>
          <view class="banner-info">
            <text class="banner-title">{{ item.vod_name }}</text>
            <text class="banner-sub">{{ item.vod_class || item.vod_remarks }}</text>
          </view>
        </swiper-item>
      </swiper>

      <!-- Banner骨架屏 -->
      <view class="banner-skeleton" v-else-if="loading">
        <view class="skeleton-banner"></view>
      </view>

      <!-- 正在热播 -->
      <!-- 正在热播（首屏预加载） -->
      <view class="section" id="sec-hot">
        <view class="section-header">
          <text class="section-title">正在热播</text>
          <text class="section-more" @click="goCat(2)">更多</text>
        </view>
        <view class="card-grid">
          <view v-if="!hotList.length" v-for="i in 6" :key="i" class="card skeleton">
            <view class="skeleton-img"></view>
            <view class="skeleton-name"></view>
          </view>
          <view v-for="item in hotList" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
            <view class="card-img-wrap">
              <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" @error="onPicError(item)" />
              <view class="card-score" v-if="getScore(item)">{{ getScore(item) }}</view>
            </view>
            <text class="card-name">{{ item.vod_name }}</text>
          </view>
        </view>
      </view>

      <!-- 最新更新（首屏预加载） -->
      <view class="section" id="sec-new">
        <view class="section-header">
          <text class="section-title">最新更新</text>
          <text class="section-more" @click="goCat(2)">更多</text>
        </view>
        <view class="card-grid">
          <view v-if="!newList.length" v-for="i in 6" :key="i" class="card skeleton">
            <view class="skeleton-img"></view>
            <view class="skeleton-name"></view>
          </view>
          <view v-for="item in newList" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
            <view class="card-img-wrap">
              <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" @error="onPicError(item)" />
              <view class="card-score" v-if="getScore(item)">{{ getScore(item) }}</view>
            </view>
            <text class="card-name">{{ item.vod_name }}</text>
          </view>
        </view>
      </view>



      <!-- 电影（懒加载） -->
      <view class="section lazy-section" id="sec-movie">
        <view class="section-header">
          <text class="section-title">电影</text>
          <text class="section-more" @click="goCat(1)">更多</text>
        </view>
        <view class="card-grid">
          <view v-if="!movieList.length" v-for="i in 6" :key="i" class="card skeleton">
            <view class="skeleton-img"></view>
            <view class="skeleton-name"></view>
          </view>
          <view v-for="item in movieList" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
            <view class="card-img-wrap">
              <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" @error="onPicError(item)" />
              <view class="card-score" v-if="getScore(item)">{{ getScore(item) }}</view>
            </view>
            <text class="card-name">{{ item.vod_name }}</text>
          </view>
        </view>
      </view>

      <!-- 电视剧（懒加载） -->
      <view class="section lazy-section" id="sec-tv">
        <view class="section-header">
          <text class="section-title">电视剧</text>
          <text class="section-more" @click="goCat(2)">更多</text>
        </view>
        <view class="card-grid">
          <view v-if="!tvList.length" v-for="i in 6" :key="i" class="card skeleton">
            <view class="skeleton-img"></view>
            <view class="skeleton-name"></view>
          </view>
          <view v-for="item in tvList" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
            <view class="card-img-wrap">
              <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" @error="onPicError(item)" />
              <view class="card-score" v-if="getScore(item)">{{ getScore(item) }}</view>
            </view>
            <text class="card-name">{{ item.vod_name }}</text>
          </view>
        </view>
      </view>

      <!-- 动漫（懒加载） -->
      <view class="section lazy-section" id="sec-ani">
        <view class="section-header">
          <text class="section-title">动漫</text>
          <text class="section-more" @click="goCat(4)">更多</text>
        </view>
        <view class="card-grid">
          <view v-if="!aniList.length" v-for="i in 6" :key="i" class="card skeleton">
            <view class="skeleton-img"></view>
            <view class="skeleton-name"></view>
          </view>
          <view v-for="item in aniList" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
            <view class="card-img-wrap">
              <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" @error="onPicError(item)" />
              <view class="card-score" v-if="getScore(item)">{{ getScore(item) }}</view>
            </view>
            <text class="card-name">{{ item.vod_name }}</text>
          </view>
        </view>
      </view>

      <!-- 综艺（懒加载） -->
      <view class="section lazy-section" id="sec-zy">
        <view class="section-header">
          <text class="section-title">综艺</text>
          <text class="section-more" @click="goCat(3)">更多</text>
        </view>
        <view class="card-grid">
          <view v-if="!zyList.length" v-for="i in 6" :key="i" class="card skeleton">
            <view class="skeleton-img"></view>
            <view class="skeleton-name"></view>
          </view>
          <view v-for="item in zyList" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
            <view class="card-img-wrap">
              <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" @error="onPicError(item)" />
              <view class="card-score" v-if="getScore(item)">{{ getScore(item) }}</view>
            </view>
            <text class="card-name">{{ item.vod_name }}</text>
          </view>
        </view>
      </view>

      <!-- 日漫（懒加载） -->
      <view class="section lazy-section" id="sec-jpani">
        <view class="section-header">
          <text class="section-title">日漫</text>
          <text class="section-more" @click="goCat(26)">更多</text>
        </view>
        <view class="card-grid">
          <view v-if="!jpAniList.length" v-for="i in 6" :key="i" class="card skeleton">
            <view class="skeleton-img"></view>
            <view class="skeleton-name"></view>
          </view>
          <view v-for="item in jpAniList" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
            <view class="card-img-wrap">
              <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" @error="onPicError(item)" />
              <view class="card-score" v-if="getScore(item)">{{ getScore(item) }}</view>
            </view>
            <text class="card-name">{{ item.vod_name }}</text>
          </view>
        </view>
      </view>

      <!-- 体育（懒加载） -->
      <view class="section lazy-section" id="sec-sport">
        <view class="section-header">
          <text class="section-title">体育</text>
          <text class="section-more" @click="goCat(22)">更多</text>
        </view>
        <view class="card-grid">
          <view v-if="!sportList.length" v-for="i in 6" :key="i" class="card skeleton">
            <view class="skeleton-img"></view>
            <view class="skeleton-name"></view>
          </view>
          <view v-for="item in sportList" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
            <view class="card-img-wrap">
              <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" @error="onPicError(item)" />
              <view class="card-score" v-if="getScore(item)">{{ getScore(item) }}</view>
            </view>
            <text class="card-name">{{ item.vod_name }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getVodList, getFilteredVodList } from "@/api/vod"
import { DEFAULT_PIC, fixPicUrl } from "@/api/config"
import { store } from "@/store"

export default {
  data() {
    return {
      loading: true,
      refreshing: false,
      // catTabs 顺序：首页（不跳转）+ 各分类快捷入口
      catTabs: ['首页', '电影', '电视剧', '动漫', '综艺', '日漫', '体育'],
      activeCat: 0,
      // catTabs 索引 → 发现页 cat 参数
      catMap: { 1: 1, 2: 2, 3: 4, 4: 3, 5: 26, 6: 22 },

      bannerList: [],
      hotList: [],
      newList: [],
      tvList: [],
      aniList: [],
      zyList: [],
      girlList: [],
      movieList: [],
      jpAniList: [],
      sportList: [],
      defaultPic: DEFAULT_PIC,
      splashVisible: true,
      splashFading: false,
      // SVG 图标字符串（用于 v-html 渲染）
      playSvg: '<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
      searchSvg: '<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    }
  },
  onLoad() { this.init() },
  onReady() {
    // 品牌闪屏 1.5s 后淡出
    setTimeout(() => {
      this.splashFading = true
      this.splashVisible = false
      setTimeout(() => { this.splashFading = false }, 500)
    }, 1500)
  },
  methods: {
    // 取评分（兼容多种字段名）
    getScore(item) {
      if (!item) return ''
      const s = item.vod_douban_score || item.vod_score || item.vod_rating
        || item.vod_douban || item.score || item.rating
      if (s === undefined || s === null || s === '' || s === 0 || s === '0' || s === '0.0') return ''
      const n = parseFloat(s)
      if (isNaN(n) || n <= 0) return ''
      return n.toFixed(1)
    },
    async init() {
      this.loading = true
      try {
        const limit = 6
        const all = await Promise.all([
          getFilteredVodList(1, undefined, undefined, 'hits', undefined, undefined, 1, 10).catch(() => ({ list: [] })),
          getFilteredVodList(2, undefined, undefined, 'time', undefined, undefined, 1, limit).catch(() => ({ list: [] })),
          getFilteredVodList(2, undefined, undefined, 'hits', undefined, undefined, 1, limit).catch(() => ({ list: [] })),
          // 其余分类全部并发加载，和电视剧同样的方式
          getFilteredVodList(1, undefined, undefined, 'time', undefined, undefined, 1, limit).catch(() => ({ list: [] })),
          getFilteredVodList(4, undefined, undefined, 'time', undefined, undefined, 1, limit).catch(() => ({ list: [] })),
          getFilteredVodList(3, undefined, undefined, 'time', undefined, undefined, 1, limit).catch(() => ({ list: [] })),
          getFilteredVodList(26, undefined, undefined, 'time', undefined, undefined, 1, limit).catch(() => ({ list: [] })),
          getFilteredVodList(22, undefined, undefined, 'time', undefined, undefined, 1, limit).catch(() => ({ list: [] })),
        ])
        const [hotRes, newRes, tvRes, movieRes, aniRes, zyRes, jpAniRes, sportRes] = all
        const hotItems = (hotRes.list || []).map(this.fixItem)
        this.bannerList = hotItems.slice(0, 5)
        this.hotList    = hotItems.slice(0, limit)
        this.newList    = (newRes.list || []).slice(0, limit).map(this.fixItem)
        this.tvList     = (tvRes.list  || []).slice(0, limit).map(this.fixItem)
        this.movieList  = (movieRes.list || []).slice(0, limit).map(this.fixItem)
        this.aniList    = (aniRes.list || []).slice(0, limit).map(this.fixItem)
        this.zyList     = (zyRes.list  || []).slice(0, limit).map(this.fixItem)
        this.jpAniList  = (jpAniRes.list || []).slice(0, limit).map(this.fixItem)
        this.sportList  = (sportRes.list || []).slice(0, limit).map(this.fixItem)
        this._prefetchBanner()
        this._prefetchCovers([...this.hotList, ...this.newList])
      } catch (e) {
        console.error('[HOME] init error:', e)
      }
      this.loading = false
    },



    _prefetchBanner() {
      // 预下载 banner 图片，渲染时直接命中缓存
      this.bannerList.forEach(item => {
        if (item.vod_pic) uni.getImageInfo({ src: item.vod_pic }).catch(() => {})
      })
    },

    _prefetchCovers(items) {
      // 预下载即将进入视口的前 N 张封面图
      items.slice(0, 8).forEach(item => {
        if (item.vod_pic) uni.getImageInfo({ src: item.vod_pic }).catch(() => {})
      })
    },


    async onRefresh() {
      this.refreshing = true
      await this.init()
      this.refreshing = false
    },
    switchCat(i) {
      this.activeCat = i
      // 首页(0)留在当前页，其余跳转到发现页对应分类
      if (i > 0 && this.catMap[i]) {
        uni.switchTab({ url: `/pages-mobile/category/index?cat=${this.catMap[i]}` })
      }
    },
    fixItem(item) {
      const pic = fixPicUrl(item.vod_pic)
      return { ...item, vod_pic: pic, _picRetry: 0, _picOriginal: pic }
    },
    onPicError(item) {
      item._picRetry = (item._picRetry || 0) + 1
      if (item._picRetry <= 2) {
        item.vod_pic = (item._picOriginal || "") + "?t=" + Date.now()
      } else {
        item.vod_pic = this.defaultPic
        item._realPic = this.defaultPic
      }
    },
    goDetail(id) { uni.navigateTo({ url: `/pages-mobile/detail/index?id=${id}` }) },
    goSearch() {
      uni.navigateTo({ url: '/pages-mobile/search/index' })
    },
    goCat(catId) { uni.switchTab({ url: `/pages-mobile/category/index?cat=${catId}` }) },
    goHistory() { uni.switchTab({ url: '/pages-mobile/mine/index' }) },
    loadMore() {},
  }
}
</script>

<style scoped>
/* 品牌闪屏 */
.splash-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  z-index: 9999; transition: opacity 0.5s ease;
}
.splash-overlay.fade-out { opacity: 0; pointer-events: none; }
.splash-logo { font-size: 120rpx; color: #fff; margin-bottom: 20rpx; }
.splash-name { font-size: 56rpx; color: #fff; font-weight: bold; letter-spacing: 8rpx; margin-bottom: 16rpx; }
.splash-slogan { font-size: 28rpx; color: rgba(255,255,255,0.7); letter-spacing: 4rpx; }

/* 整个页面占满视口，禁止页面级滚动，所有滚动在 scroll-view 内 */
.page { background: #F5F5F5; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }

/* 顶部固定区（top-bar + cat-scroll 一体） */
.header-fixed {
  flex-shrink: 0;
  background: #fff;
  /* 防止 fixed 子元素产生重影，父元素 createLayer */
  position: relative;
  z-index: 10;
}

/* 顶部搜索栏 */
.top-bar {
  display: flex; align-items: center; gap: 20rpx;
  padding: 16rpx 32rpx;
  padding-top: calc(30rpx + var(--status-bar-height, 48rpx));
  background: #fff;
}
.logo-box { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.logo-icon { font-size: 32rpx; color: #E53935; }
.logo-text { font-size: 32rpx; font-weight: bold; color: #E53935; }

.search-box {
  flex: 1; display: flex; align-items: center;
  background: #F5F5F5; border-radius: 32rpx;
  padding: 14rpx 24rpx; gap: 12rpx;
}
.search-icon { font-size: 24rpx; color: #999; }
.search-placeholder { flex: 1; font-size: 26rpx; color: #999; }
.search-filter {
  font-size: 24rpx; color: #666;
  padding-left: 20rpx; border-left: 1rpx solid #ddd;
}

/* 分类Tab */
.cat-scroll { white-space: nowrap; padding: 16rpx 32rpx; background: #fff; }
.cat-tab {
  display: inline-block; padding: 10rpx 28rpx; margin-right: 16rpx;
  border-radius: 32rpx; background: #F5F5F5;
}
.cat-tab text { font-size: 26rpx; color: #666; }
.cat-tab.active { background: #E53935; }
.cat-tab.active text { color: #fff; font-weight: bold; }

/* 内容滚动区 - 占据剩余空间，flex: 1 + min-height: 0 保证收缩 */
.page-scroll {
  flex: 1; min-height: 0;
  background: #F5F5F5;
}

.banner-swiper { width: 100%; height: 360rpx; }
.banner-img { width: 100%; height: 100%; }
.banner-mask { position: absolute; bottom: 0; left: 0; right: 0; height: 160rpx; background: linear-gradient(transparent, rgba(0,0,0,0.7)); }
.banner-info { position: absolute; bottom: 30rpx; left: 32rpx; }
.banner-title { display: block; font-size: 36rpx; font-weight: bold; color: #fff; }
.banner-sub { font-size: 24rpx; color: rgba(255,255,255,0.8); margin-top: 6rpx; }

.section { margin: 32rpx 0; }
.section-header { display: flex; justify-content: space-between; align-items: center; padding: 0 32rpx; margin-bottom: 20rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; }
.section-more { font-size: 24rpx; color: #E53935; }

.card-grid { display: flex; flex-wrap: wrap; padding: 0 24rpx; }
.card { width: calc((100% - 24rpx) / 3); margin-right: 12rpx; margin-bottom: 24rpx; }
.card:nth-child(3n) { margin-right: 0; }
.card:active { opacity: 0.8; }
.card-img-wrap { position: relative; border-radius: 12rpx; overflow: hidden; }
.card-img { width: 100%; height: 280rpx; background: #e0e0e0; display: block; }
.card-score {
  position: absolute; bottom: 8rpx; right: 8rpx;
  padding: 4rpx 10rpx; background: rgba(0,0,0,0.6);
  border-radius: 8rpx; font-size: 22rpx; color: gold; font-weight: bold;
}
.card-name {
  display: block; margin-top: 10rpx; font-size: 26rpx; color: #333;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.safe-bottom { height: 20rpx; }

/* 骨架屏 */
.skeleton { pointer-events: none; }
.skeleton-img {
  width: 100%; height: 280rpx; border-radius: 12rpx;
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
.skeleton-name {
  height: 24rpx; width: 80%; border-radius: 6rpx; margin-top: 10rpx;
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
.skeleton-banner {
  width: 100%; height: 360rpx;
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}


</style>
