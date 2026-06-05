<template>
  <view class="page">
    <!-- 整页滚动：导航栏在正常文档流中，TV焦点可自然上下穿越 -->
    <scroll-view scroll-y class="page-scroll" :focusable="false">
      <!-- 顶部导航栏 -->
      <view class="top-nav">
        <view class="nav-logo">
          <text class="logo-text">星途TV</text>
        </view>
        <view class="nav-menu">
          <view
            v-for="(item, i) in navItems"
            :key="item.id"
            :class="['nav-item', activeNav === i ? 'active' : '']"
            :focusable="true"
            @click="switchNav(i)"
            @focus="onNavFocus(i)"
          >
            <text class="nav-text">{{ item.name }}</text>
          </view>
        </view>
        <view class="nav-search" @click="goSearch" :focusable="true">
          <text class="search-icon">🔍</text>
        </view>
      </view>

      <!-- Banner轮播 - TV: 横向聚焦列表，左右键自然切换 -->
      <view class="banner-wrap" v-if="bannerList.length">
        <scroll-view scroll-x class="banner-swiper" :scroll-into-view="'banner-' + bannerIndex" :focusable="false">
          <view
            v-for="(item, i) in bannerList"
            :key="i"
            :id="'banner-' + i"
            class="banner-item"
            :focusable="true"
            @focus="onBannerFocus(i)"

            @click="goDetail(item.vod_id)"
          >
            <image class="banner-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load @error="onPicError(item)" />
            <view class="banner-info">
              <text class="banner-title">{{ item.vod_name }}</text>
              <text class="banner-sub">{{ item.vod_remarks || item.vod_class }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="banner-dots">
          <view v-for="(item, i) in bannerList" :key="i" :class="['dot', bannerIndex === i ? 'active' : '']"></view>
        </view>
      </view>

      <!-- 追剧更新提醒 -->
      <view class="update-notify" v-if="followUpdateCount > 0" @click="goMine" :focusable="true">
        <text class="notify-icon">📺</text>
        <text class="notify-text">{{ followUpdateCount }}部追剧有更新</text>
        <text class="notify-arrow">查看 ></text>
      </view>

      <!-- 继续观看 -->
      <view class="section" v-if="continueList.length">
        <view class="section-header">
          <text class="section-title">▶ 继续观看</text>
          <view class="more-btn" @click="goHistory" :focusable="true"><text>更多 ></text></view>
        </view>
        <scroll-view scroll-x class="h-scroll" :focusable="false">
          <view v-for="item in continueList" :key="item.vod_id" class="card-lg" :focusable="true" @click="goPlay(item)" @focus="lastFocusKey='continue-'+item.vod_id">
            <image class="card-lg-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load @error="onPicError(item)" />
            <view class="card-lg-info">
              <text class="card-lg-title">{{ item.vod_name }}</text>
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: (item.duration > 0 ? item.progress / item.duration * 100 : 0) + '%' }"></view>
              </view>
              <view class="card-lg-meta">
                <text class="card-lg-sub">第{{ (item.episode || 0) + 1 }}集</text>
                <text class="card-lg-time">{{ fmtTime(item.progress) }} / {{ fmtTime(item.duration) }}</text>
              </view>
            </view>
            <view class="card-badge">续播</view>
          </view>
        </scroll-view>
      </view>

      <!-- 为你推荐 -->
      <view class="section" v-if="recommendList.length">
        <view class="section-header">
          <text class="section-title">✨ 为你推荐</text>
        </view>
        <scroll-view scroll-x class="h-scroll" :focusable="false">
          <view v-for="item in recommendList" :key="item.vod_id" class="card" :focusable="true" @click="goDetail(item.vod_id)" @focus="lastFocusKey='rec-'+item.vod_id">
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load @error="onPicError(item)" />
            <text class="card-title">{{ item.vod_name }}</text>
            <text class="card-remark" v-if="getRemarks(item)">{{ getRemarks(item) }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 最新上线 -->
      <view class="section" v-if="newList.length">
        <view class="section-header">
          <text class="section-title">🆕 最新上线</text>
          <view class="more-btn" @click="goCategory('time')" :focusable="true"><text>更多 ></text></view>
        </view>
        <scroll-view scroll-x class="h-scroll" :focusable="false">
          <view v-for="item in newList" :key="item.vod_id" class="card" :focusable="true" @click="goDetail(item.vod_id)" @focus="lastFocusKey='new-'+item.vod_id">
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load @error="onPicError(item)" />
            <text class="card-title">{{ item.vod_name }}</text>
            <text class="card-remark" v-if="getRemarks(item)">{{ getRemarks(item) }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 热门电影 -->
      <view class="section" v-if="hotMovieList.length">
        <view class="section-header">
          <text class="section-title">🔥 热门电影</text>
          <view class="more-btn" @click="goCategory('hits', 1)" :focusable="true"><text>更多 ></text></view>
        </view>
        <scroll-view scroll-x class="h-scroll" :focusable="false">
          <view v-for="item in hotMovieList" :key="item.vod_id" class="card" :focusable="true" @click="goDetail(item.vod_id)" @focus="lastFocusKey='hotm-'+item.vod_id">
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load @error="onPicError(item)" />
            <text class="card-title">{{ item.vod_name }}</text>
            <text class="card-remark" v-if="getRemarks(item)">{{ getRemarks(item) }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 热门电视剧 -->
      <view class="section" v-if="hotTvList.length">
        <view class="section-header">
          <text class="section-title">🔥 热门电视剧</text>
          <view class="more-btn" @click="goCategory('hits', 2)" :focusable="true"><text>更多 ></text></view>
        </view>
        <scroll-view scroll-x class="h-scroll" :focusable="false">
          <view v-for="item in hotTvList" :key="item.vod_id" class="card" :focusable="true" @click="goDetail(item.vod_id)" @focus="lastFocusKey='hottv-'+item.vod_id">
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load @error="onPicError(item)" />
            <text class="card-title">{{ item.vod_name }}</text>
            <text class="card-remark" v-if="getRemarks(item)">{{ getRemarks(item) }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 热门综艺 -->
      <view class="section" v-if="hotVarietyList.length">
        <view class="section-header">
          <text class="section-title">🔥 热门综艺</text>
          <view class="more-btn" @click="goCategory('hits', 3)" :focusable="true"><text>更多 ></text></view>
        </view>
        <scroll-view scroll-x class="h-scroll" :focusable="false">
          <view v-for="item in hotVarietyList" :key="item.vod_id" class="card" :focusable="true" @click="goDetail(item.vod_id)" @focus="lastFocusKey='hotv-'+item.vod_id">
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load @error="onPicError(item)" />
            <text class="card-title">{{ item.vod_name }}</text>
            <text class="card-remark" v-if="getRemarks(item)">{{ getRemarks(item) }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 热门动漫 -->
      <view class="section" v-if="hotAnimeList.length">
        <view class="section-header">
          <text class="section-title">🔥 热门动漫</text>
          <view class="more-btn" @click="goCategory('hits', 4)" :focusable="true"><text>更多 ></text></view>
        </view>
        <scroll-view scroll-x class="h-scroll" :focusable="false">
          <view v-for="item in hotAnimeList" :key="item.vod_id" class="card" :focusable="true" @click="goDetail(item.vod_id)" @focus="lastFocusKey='hota-'+item.vod_id">
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load @error="onPicError(item)" />
            <text class="card-title">{{ item.vod_name }}</text>
            <text class="card-remark" v-if="getRemarks(item)">{{ getRemarks(item) }}</text>
          </view>
        </scroll-view>
      </view>

      <view class="load-section" v-if="loading"><text class="loading-text">加载中...</text></view>
      <view class="safe-bottom"></view>
    </scroll-view>

    <!-- 骨架屏 -->
    <view class="skeleton-mask" v-if="pageLoading">
      <!-- Banner骨架 -->
      <view class="sk-banner">
        <view class="sk-banner-box"></view>
        <view class="sk-dots">
          <view class="sk-dot"></view>
          <view class="sk-dot"></view>
          <view class="sk-dot"></view>
        </view>
      </view>
      <!-- 卡片骨架 -->
      <view class="sk-section">
        <view class="sk-title-box"></view>
        <view class="sk-row">
          <view class="sk-card" v-for="i in 4" :key="i">
            <view class="sk-img"></view>
            <view class="sk-line"></view>
          </view>
        </view>
      </view>
      <view class="sk-section">
        <view class="sk-title-box w60"></view>
        <view class="sk-row">
          <view class="sk-card" v-for="i in 4" :key="i">
            <view class="sk-img"></view>
            <view class="sk-line"></view>
          </view>
        </view>
      </view>
      <view class="sk-section">
        <view class="sk-title-box w50"></view>
        <view class="sk-row">
          <view class="sk-card" v-for="i in 4" :key="i">
            <view class="sk-img"></view>
            <view class="sk-line"></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getVodList, getFilteredVodList } from "@/api/vod"
import { DEFAULT_PIC, fixPicUrl } from "@/api/config"
import { autoFocus } from "@/utils/focus"
import { formatTime } from "@/utils/format"
import epMixin from "@/mixins/epMixin"

export default {
  mixins: [epMixin],
  data() {
    return {
      pageLoading: true,
      loading: false,
      activeNav: 0,
      // P2-1: 焦点记忆
      lastFocusKey: "",
      // 导航分类与苹果CMS实际ID对应
      navItems: [
        { id: 0, name: "首页" },
        { id: 1, name: "电影" },
        { id: 2, name: "电视剧" },
        { id: 3, name: "综艺" },
        { id: 4, name: "动漫" },
        { id: 22, name: "体育" },
      ],
      bannerList: [],
      bannerIndex: 0,
      continueList: [],
      recommendList: [],
      newList: [],
      hotMovieList: [],
      hotTvList: [],
      hotVarietyList: [],
      hotAnimeList: [],
      defaultPic: DEFAULT_PIC,
      // P5: 追剧更新角标
      followUpdateCount: 0,
    }
  },
  onLoad() { this.init() },
  onShow() {
    this.loadContinueWatch()
    this.loadEpCache()
    // P5: 检查追剧更新
    this.checkFollowUpdates()
  },
  onReady() {
    // 页面渲染完成后自动聚焦第一个可交互元素
    this.$nextTick(() => autoFocus(this.$el))
  },
  // P1-4: 全局返回键 - 首页按返回弹退出确认
  onBackPress(e) {
    // 仅首页拦截返回键，子页面正常返回
    if (e.from === 'backbutton') {
      uni.showModal({
        title: "退出应用",
        content: "确定要退出星途TV吗？",
        confirmText: "退出",
        cancelText: "再看看",
        success: (res) => {
          if (res.confirm) {
            // #ifdef APP-PLUS
            plus.runtime.quit()
            // #endif
          }
        }
      })
      return true // 阻止默认返回行为
    }
  },
  methods: {
    async init() {
      this.pageLoading = true
      try {
        const [hotRes, newRes, movieRes, tvRes, varietyRes, animeRes] = await Promise.all([
          getVodList({ pg: 1 }).catch(() => ({ list: [] })),
          getFilteredVodList(1, undefined, undefined, "time", undefined, undefined, 1, 12).catch(() => ({ list: [] })),
          getFilteredVodList(1, undefined, undefined, "hits", undefined, undefined, 1, 12).catch(() => ({ list: [] })),
          getFilteredVodList(2, undefined, undefined, "hits", undefined, undefined, 1, 12).catch(() => ({ list: [] })),
          getFilteredVodList(3, undefined, undefined, "hits", undefined, undefined, 1, 12).catch(() => ({ list: [] })),
          getFilteredVodList(4, undefined, undefined, "hits", undefined, undefined, 1, 12).catch(() => ({ list: [] })),
        ])

        // 首屏：banner + 推荐 + 继续观看
        this.bannerList = (hotRes.list || []).slice(0, 5).map(this.fixItem)
        this.recommendList = (hotRes.list || []).map(this.fixItem)
        this.loadContinueWatch()

        // 延迟加载后续区块，避免一次性渲染太多图片导致部分加载失败
        const _hotRes = hotRes; const _newRes = newRes; const _movieRes = movieRes
        const _tvRes = tvRes; const _varietyRes = varietyRes; const _animeRes = animeRes
        setTimeout(() => {
          this.newList = (_newRes.list || []).map(this.fixItem)
          this.hotMovieList = (_movieRes.list || []).map(this.fixItem)
        }, 200)
        setTimeout(() => {
          this.hotTvList = (_tvRes.list || []).map(this.fixItem)
          this.hotVarietyList = (_varietyRes.list || []).map(this.fixItem)
          this.hotAnimeList = (_animeRes.list || []).map(this.fixItem)
        }, 400)

        // 后台预加载真实集数（延迟执行，避免阻塞首屏渲染）
        const allItems = [
          ...(hotRes.list || []),
          ...(newRes.list || []),
          ...(tvRes.list || []),
          ...(varietyRes.list || []),
          ...(animeRes.list || []),
        ]
        setTimeout(() => { this.prefetchEpCounts(allItems) }, 1500)
      } catch (e) { console.error("init fail", e) }
      this.pageLoading = false
    },
    loadContinueWatch() {
      try {
        const history = uni.getStorageSync("play_history") || []
        this.continueList = history.slice(0, 6).map(h => ({
          ...h,
          vod_pic: this.fixPicUrl(h.vod_pic || ""),
        }))
      } catch (e) { this.continueList = [] }
    },
    fixItem(item) {
      const pic = this.fixPicUrl(item.vod_pic)
      return { ...item, vod_pic: pic, _picRetry: 0, _picOriginal: pic }
    },
    fixPicUrl,
    onPicError(item) {
      const retry = (item._picRetry || 0) + 1
      item._picRetry = retry
      const maxRetry = 2
      if (retry <= maxRetry) {
        // 重试：加随机参数绕过缓存
        item.vod_pic = (item._picOriginal || "") + "?t=" + Date.now()
      } else {
        // 重试耗尽，尝试去掉 .jpg 后缀（可能是后端本身就有扩展名）
        const original = item._picOriginal || ""
        if (original.endsWith(".jpg") && !item._picStripped) {
          item._picStripped = true
          item.vod_pic = original.replace(/\.jpg$/, "") + "?t=" + Date.now()
          item._picRetry = 0
        } else {
          // 最终放弃，显示默认图
          item.vod_pic = ""
        }
      }
    },
    switchNav(i) {
      this.activeNav = i
      if (i === 0) { this.init() }
      else {
        const navItem = this.navItems[i]
        uni.navigateTo({ url: `/pages/category/index?t=${navItem.id}&title=${navItem.name}` })
      }
    },
    onNavFocus(i) { this.activeNav = i },
    onBannerFocus(i) { this.bannerIndex = i },

    goDetail(id) { uni.navigateTo({ url: `/pages/detail/index?id=${id}` }) },
    goPlay(item) {
      uni.navigateTo({ url: `/pages/player/index?id=${item.vod_id}&ep=${item.episode || 0}&title=${encodeURIComponent(item.vod_name)}` })
    },
    goSearch() { uni.navigateTo({ url: "/pages/search/index" }) },
    goHistory() { uni.navigateTo({ url: "/pages/mine/index" }) },
    goMine() { uni.navigateTo({ url: "/pages/mine/index" }) },
    // P5: 检查追剧更新数量
    checkFollowUpdates() {
      try {
        const follows = uni.getStorageSync("my_follows") || []
        let count = 0
        for (const f of follows) {
          if (f.newEp && f.newEp > 0) count++
        }
        this.followUpdateCount = count
      } catch (e) { this.followUpdateCount = 0 }
    },
    fmtTime: formatTime,
    goCategory(order, typeId) {
      let url = `/pages/category/index?`
      if (typeId) url += `t=${typeId}&`
      if (order) url += `order=${order}`
      uni.navigateTo({ url })
    },
  }
}
</script>

<style scoped>
.page { background: linear-gradient(180deg, #0a1628 0%, #0f1a2a 100%); height: 100vh; width: 100%; overflow: hidden; }
.page-scroll { height: 100vh; }
.top-nav {
  height: 120rpx;
  background: linear-gradient(180deg, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0) 100%);
  display: flex; flex-direction: row; align-items: center; padding: 0 60rpx;
  flex-shrink: 0;
}
.nav-logo { margin-right: 60rpx; }
.logo-text { font-size: 48rpx; font-weight: bold; color: #00d4ff; text-shadow: 0 0 20rpx rgba(0,212,255,0.5); }
.nav-menu { display: flex; flex-direction: row; gap: 40rpx; flex: 1; }
.nav-item { padding: 16rpx 40rpx; border-radius: 8rpx; transition: all 0.2s ease; }
.nav-item.active { background: rgba(0,212,255,0.2); }
.nav-text { font-size: 32rpx; color: #8aa; }
.nav-item.active .nav-text { color: #00d4ff; font-weight: bold; }
.nav-search { padding: 16rpx 24rpx; }
.search-icon { font-size: 36rpx; color: #8aa; }
.banner-wrap { position: relative; width: 100%; height: 600rpx; margin-bottom: 40rpx; }
.banner-swiper { width: 100%; height: 100%; white-space: nowrap; }
.banner-item { display: inline-block; width: 100%; height: 100%; position: relative; vertical-align: top; }
.banner-img { width: 100%; height: 100%; }
.banner-info { position: absolute; bottom: 40rpx; left: 60rpx; right: 60rpx; }
.banner-title { font-size: 56rpx; font-weight: bold; color: #fff; text-shadow: 0 4rpx 20rpx rgba(0,0,0,0.8); }
.banner-sub { font-size: 32rpx; color: #ccc; margin-top: 16rpx; }
.banner-dots { position: absolute; bottom: 20rpx; left: 50%; transform: translateX(-50%); display: flex; gap: 16rpx; }
.dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: rgba(255,255,255,0.3); }
.dot.active { background: #00d4ff; width: 40rpx; border-radius: 8rpx; }
.section { margin: 40rpx 0; padding: 0 60rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30rpx; }
.section-title { font-size: 40rpx; font-weight: bold; color: #fff; }
.more-btn { padding: 12rpx 24rpx; background: rgba(0,212,255,0.2); border-radius: 8rpx; transition: all 0.2s ease; }
.more-btn:focus { transform: scale(1.1); background: rgba(0,212,255,0.4); box-shadow: 0 0 20rpx rgba(0,212,255,0.6); }
.more-btn text { font-size: 26rpx; color: #00d4ff; }
.h-scroll { white-space: nowrap; }
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
.card-lg-info { padding: 20rpx; }
.card-lg-title { display: block; font-size: 34rpx; color: #fff; margin-bottom: 16rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.progress-bar { width: 100%; height: 12rpx; background: rgba(255,255,255,0.2); border-radius: 4rpx; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #00d4ff, #00ff88); }
.card-lg-sub { display: block; font-size: 28rpx; color: #888; }
.card-lg-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.card-lg-sub { font-size: 28rpx; color: #888; }
.card-lg-time { font-size: 26rpx; color: #00d4ff; }
.card-badge { position: absolute; top: 16rpx; right: 16rpx; padding: 8rpx 16rpx; background: linear-gradient(135deg, #ff6b35, #ff4757); border-radius: 8rpx; font-size: 28rpx; color: #fff; }
.load-section { text-align: center; padding: 40rpx; }
.loading-text { color: #666; font-size: 26rpx; }
.loading-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, #0a1628 0%, #0f1a2a 100%);
  display: flex; justify-content: center; align-items: center; z-index: 2000;
}
.loading-content { text-align: center; }
.loading-content .loading-text { font-size: 72rpx; color: #00d4ff; font-weight: bold; }
.loading-content .loading-sub { font-size: 28rpx; color: #688; margin-top: 30rpx; }

/* 骨架屏 */
.skeleton-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto;
  background: linear-gradient(180deg, #0a1628 0%, #0f1a2a 100%); z-index: 2000;
  padding: 60rpx;
}
@keyframes shimmer {
  0% { background-position: -400rpx 0; }
  100% { background-position: 400rpx 0; }
}
.sk-banner { height: 520rpx; margin-bottom: 40rpx; position: relative; }
.sk-banner-box {
  width: 100%; height: 100%; border-radius: 20rpx;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 800rpx 100%;
  animation: shimmer 2s infinite;
}
.sk-dots { position: absolute; bottom: 20rpx; left: 50%; transform: translateX(-50%); display: flex; gap: 16rpx; }
.sk-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: rgba(255,255,255,0.1); }
.sk-section { margin-bottom: 50rpx; }
.sk-title-box {
  width: 240rpx; height: 40rpx; border-radius: 8rpx; margin-bottom: 30rpx;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 800rpx 100%;
  animation: shimmer 2s infinite;
}
.sk-title-box.w60 { width: 180rpx; }
.sk-title-box.w50 { width: 150rpx; }
.sk-row { display: flex; gap: 30rpx; }
.sk-card { width: 240rpx; }
.sk-img {
  width: 240rpx; height: 340rpx; border-radius: 16rpx;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 800rpx 100%;
  animation: shimmer 2s infinite;
}
.sk-line {
  height: 30rpx; border-radius: 6rpx; margin-top: 16rpx;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 800rpx 100%;
  animation: shimmer 2s infinite;
}
.safe-bottom { height: 100rpx; }

/* P5: 追剧更新提醒 */
.update-notify {
  display: flex; align-items: center; margin: 0 60rpx 30rpx; padding: 28rpx 36rpx;
  background: linear-gradient(135deg, rgba(255,107,53,0.2), rgba(255,71,87,0.2));
  border-radius: 16rpx; border: 2rpx solid rgba(255,107,53,0.4);
  transition: all 0.2s ease;
}
.update-notify:focus { transform: scale(1.02); box-shadow: 0 0 20rpx rgba(255,107,53,0.5); }
.notify-icon { font-size: 40rpx; margin-right: 20rpx; }
.notify-text { flex: 1; font-size: 30rpx; color: #ffcc80; font-weight: bold; }
.notify-arrow { font-size: 28rpx; color: #ff8a65; }

</style>
