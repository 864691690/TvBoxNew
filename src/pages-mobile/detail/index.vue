<template>
  <view class="page">
    <!-- 顶部返回 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
        <text class="back-text">返回</text>
      </view>
      <text class="top-title">影片详情</text>
    </view>

    <!-- 加载中 -->
    <view class="loading-wrap" v-if="loading">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <scroll-view scroll-y class="page-scroll" v-else-if="detail">
      <!-- 海报区域 -->
      <view class="hero-section">
        <image class="backdrop" :src="detail.vod_pic || defaultPic" mode="aspectFill" />
        <view class="backdrop-mask"></view>
        <view class="hero-content">
          <image class="poster" :src="detail.vod_pic || defaultPic" mode="aspectFill" />
          <view class="hero-info">
            <text class="title">{{ detail.vod_name }}</text>
            <view class="meta-row">
              <text class="meta-item">{{ detail.vod_year || '未知' }}</text>
              <text class="meta-dot">·</text>
              <text class="meta-item">{{ typeName }}</text>
              <text class="meta-dot">·</text>
              <text class="meta-item">{{ detail.vod_area || '未知' }}</text>
            </view>
            <text class="meta-item" v-if="detail.vod_actor">主演：{{ detail.vod_actor }}</text>
            <text class="meta-item" v-if="detail.vod_director">导演：{{ detail.vod_director }}</text>
            <view class="score-badge" v-if="detail.vod_score">
              <view class="score-icon" v-html="dotSvg"></view>
              <text class="score-source">豆瓣</text>
              <text class="score-num">{{ detail.vod_score }}</text>
              <text class="score-label">分</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 简介 -->
      <view class="desc-section">
        <text class="desc-label">剧情简介</text>
        <view class="desc-content" @click="toggleDesc">
          <text :class="['desc-text', descExpanded ? 'expanded' : '']">
            {{ detail.vod_content || '暂无简介' }}
          </text>
          <text class="desc-toggle">{{ descExpanded ? '收起' : '展开' }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-row">
        <view class="btn-play" @click="playFirst">
          <view class="play-icon" v-html="playSvg"></view>
          <text>立即播放</text>
        </view>
        <view :class="['btn-collect', collected ? 'collected' : '']" @click="toggleCollect">
          <view class="collect-icon" v-html="collected ? starFullSvg : starOutlineSvg"></view>
          <text>{{ collected ? ' 已收藏' : ' 收藏' }}</text>
        </view>
      </view>

      <!-- 线路切换 -->
      <view class="route-section" v-if="routeList.length > 1">
        <scroll-view scroll-x class="route-scroll" :show-scrollbar="false">
          <view
            v-for="(route, i) in routeList"
            :key="i"
            :class="['route-chip', activeRoute === i ? 'active' : '']"
            @click="switchRoute(i)"
          >
            <text>{{ route }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 选集 -->
      <view class="episode-section" v-if="episodeList.length > 0">
        <text class="section-title">选集 (共{{ episodeList.length }}集)</text>
        <template v-if="!needsGrouping">
          <view class="episode-grid">
            <view
              v-for="(ep, i) in episodeList"
              :key="i"
              :class="['ep-item', currentEp === i ? 'active' : '', historyEp === i ? 'history' : '']"
              @click="playEpisode(i)"
            >
              <text class="ep-text">{{ ep.name }}</text>
            </view>
          </view>
        </template>
        <template v-else>
          <view v-for="(group, gi) in epGroups" :key="gi" class="ep-group">
            <view class="ep-group-header" @click="toggleGroup(gi)">
              <text class="ep-group-arrow">{{ expandedGroups[gi] ? '<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>' : '<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>' }}</text>
              <text class="ep-group-label">{{ group.label }}</text>
              <text class="ep-group-count">({{ group.items.length }}集)</text>
            </view>
            <view class="episode-grid" v-show="expandedGroups[gi]">
              <view
                v-for="(ep, localIdx) in group.items"
                :key="localIdx"
                :class="['ep-item', currentEp === (gi * groupSize + localIdx) ? 'active' : '', historyEp === (gi * groupSize + localIdx) ? 'history' : '']"
                @click="playEpisode(gi * groupSize + localIdx)"
              >
                <text class="ep-text">{{ ep.name }}</text>
              </view>
            </view>
          </view>
        </template>
      </view>

      <!-- 猜你喜欢 -->
      <view class="recommend-section" v-if="recommendList.length">
        <text class="section-title">猜你喜欢</text>
        <scroll-view scroll-x class="h-scroll" :show-scrollbar="false">
          <view v-for="item in recommendList" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load />
            <text class="card-title">{{ item.vod_name }}</text>
            <text class="card-tag" v-if="item.vod_remarks">{{ item.vod_remarks }}</text>
          </view>
        </scroll-view>
      </view>

      <view class="safe-bottom"></view>
    </scroll-view>

    <!-- 空状态 -->
    <view class="empty-wrap" v-if="!loading && !detail">
      <text class="empty-text">抱歉，该内容暂不可用</text>
      <view class="retry-btn" @click="loadDetail"><text>重新加载</text></view>
    </view>

    <!-- 续播提示弹窗 -->
    <view class="resume-modal" v-if="showResumeModal" @click="showResumeModal = false">
      <view class="resume-card" @click.stop>
        <text class="resume-title">上次看到这里</text>
        <text class="resume-sub">第 {{ resumeEpisode + 1 }} 集 · {{ resumeItem?.episode > 0 ? '看到第'+resumeItem.episode+'集' : '开始播放' }}</text>
        <view class="resume-btns">
          <view class="resume-btn resume-btn--cancel" @click="resumeFromBeginning">
            <text>从头播放</text>
          </view>
          <view class="resume-btn resume-btn--confirm" @click="resumeContinue">
            <text>继续播放</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getVodDetail, getVodList } from "@/api/vod"
import { DEFAULT_PIC, fixPicUrl } from "@/api/config"
import { parseEpisodeCount, saveEpCache } from "@/utils/epCache"
import { store } from "@/store"

const TYPE_MAP = { 1: '电影', 2: '连续剧', 3: '综艺', 4: '动漫', 5: '体育' }

export default {
  data() {
    return {
      loading: true,
      vodId: 0,
      detail: null,
      defaultPic: DEFAULT_PIC,
      descExpanded: false,
      collected: false,
      routeList: [],
      routeUrls: [],
      activeRoute: 0,
      episodeList: [],
      currentEp: 0,
      historyEp: -1,
      recommendList: [],
      groupSize: 20,
      expandedGroups: {},
      showResumeModal: false,
      resumeItem: null,
      resumeEpisode: -1,
      // SVG 图标字符串（用于 v-html 渲染）
      dotSvg: '<svg class="icon green-dot" xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#4CAF50" stroke="none"></circle></svg>',
      playSvg: '<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
      starFullSvg: '<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
      starOutlineSvg: '<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    }
  },
  computed: {
    typeName() { return TYPE_MAP[this.detail?.type_id] || this.detail?.vod_class || '未分类' },
    epGroups() {
      const groups = []
      for (let i = 0; i < this.episodeList.length; i += this.groupSize) {
        const end = Math.min(i + this.groupSize, this.episodeList.length)
        groups.push({ label: `第${i + 1}-${end}集`, items: this.episodeList.slice(i, end), groupIndex: groups.length })
      }
      return groups
    },
    needsGrouping() { return this.episodeList.length > this.groupSize }
  },
  onLoad(options) {
    if (options.id) {
      this.vodId = Number(options.id)
      this.loadDetail()
      this.loadHistory()
      this.loadCollectStatus()
    }
  },
  onShow() {
    this.loadHistory()
  },
  methods: {
    async loadDetail() {
      this.loading = true
      try {
        const res = await getVodDetail(this.vodId)
        if (res.list && res.list.length > 0) {
          this.detail = this.fixItem(res.list[0])
          this.parseEpisodes()
          this.loadRecommend()
          // 续播弹窗（仅电视剧/动漫 且有历史记录）
          this.checkResume()
        }
      } catch (e) {
        console.error("loadDetail fail", e)
        uni.showToast({ title: '加载失败，请检查网络', icon: 'none' })
      }
      this.loading = false
    },

    checkResume() {
      const history = this.getPlayHistory()
      if (!history || !this.detail) return
      // 只对电视剧/动漫提示
      if (this.detail.type_id !== 2 && this.detail.type_id !== 4) return
      if (history.episode > 0) {
        this.resumeItem = history
        this.resumeEpisode = history.episode
        this.showResumeModal = true
      }
    },

    resumeContinue() {
      this.showResumeModal = false
      this.playEpisode(this.resumeEpisode)
    },

    resumeFromBeginning() {
      this.showResumeModal = false
      this.playEpisode(0)
    },
    parseEpisodes() {
      const vodPlayFrom = this.detail.vod_play_from || ""
      const vodPlayUrl = this.detail.vod_play_url || ""
      if (!vodPlayUrl) { this.routeList = []; this.episodeList = []; return }
      const routes = vodPlayFrom.split("$$$").filter(r => r)
      const urlRoutes = vodPlayUrl.split("$$$")
      this.routeList = routes.length > 0 ? routes : ["默认线路"]
      this.routeUrls = urlRoutes
      this.switchRoute(0)
      this.cacheRealEpisodeCount()
    },
    cacheRealEpisodeCount() {
      const maxCount = parseEpisodeCount(this.detail)
      if (maxCount > 0) saveEpCache(this.vodId, maxCount, this.detail.vod_name)
    },
    switchRoute(index) {
      this.activeRoute = index
      const routeUrl = this.routeUrls[index] || ""
      const episodes = routeUrl.split("#").filter(e => e)
      this.episodeList = episodes.map((ep, i) => {
        const idx = ep.indexOf("$")
        if (idx >= 0) return { name: ep.substring(0, idx) || `第${i+1}集`, url: ep.substring(idx+1) }
        return { name: `第${i+1}集`, url: ep }
      })
      const history = this.getPlayHistory()
      if (history && history.episode >= 0 && history.episode < this.episodeList.length) {
        this.historyEp = history.episode
        this.currentEp = history.episode
      } else { this.currentEp = 0; this.historyEp = -1 }
      this.autoExpandGroup()
    },
    toggleGroup(gi) { this.$set(this.expandedGroups, gi, !this.expandedGroups[gi]) },
    autoExpandGroup() {
      const gi = Math.floor(this.currentEp / this.groupSize)
      this.$set(this.expandedGroups, gi, true)
    },
    async loadRecommend() {
      try {
        const res = await getVodList({ t: this.detail.type_id, pg: 1 })
        this.recommendList = (res.list || []).filter(item => item.vod_id !== this.vodId).slice(0, 10).map(this.fixItem)
      } catch (e) { this.recommendList = [] }
    },
    loadHistory() { const history = this.getPlayHistory(); if (history) this.historyEp = history.episode },
    getPlayHistory() { return store.getHistory(this.vodId) },
    loadCollectStatus() { this.collected = store.isCollected(this.vodId) },
    fixItem(item) {
      return { ...item, vod_pic: fixPicUrl(item.vod_pic), vod_content: this.stripHtml(item.vod_content) }
    },
    stripHtml(html) { if (!html) return ""; return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim() },
    toggleDesc() { this.descExpanded = !this.descExpanded },
    toggleCollect() {
      const item = { vod_id: this.vodId, vod_name: this.detail.vod_name, vod_pic: this.detail.vod_pic, vod_remarks: this.detail.vod_remarks, type_id: this.detail.type_id || this.detail.type_id_1, totalEp: this.episodeList.length }
      this.collected = store.toggleCollect(item)
      if (this.collected && this.detail.type_id === 2) { if (!store.isFollowing(this.vodId)) store.toggleFollow(item) }
      if (!this.collected) { if (store.isFollowing(this.vodId)) store.toggleFollow(item) }
    },
    playFirst() {
      if (this.episodeList.length > 0) this.playEpisode(0)
      else uni.showToast({ title: "暂无播放源", icon: "none" })
    },
    playEpisode(index) {
      if (index < 0 || index >= this.episodeList.length) return
      this.currentEp = index
      const ep = this.episodeList[index]
      uni.navigateTo({ url: `/pages-mobile/player/index?id=${this.vodId}&ep=${index}&title=${encodeURIComponent(this.detail.vod_name)}&url=${encodeURIComponent(ep.url)}` })
    },
    goDetail(id) { uni.navigateTo({ url: `/pages-mobile/detail/index?id=${id}` }) },
    goBack() {
      const pages = getCurrentPages ? getCurrentPages() : []
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
.page { background: #F5F5F5; min-height: 100vh; display: flex; flex-direction: column; }
.page-scroll { flex: 1; min-height: 0; }

.top-bar {
  display: flex; align-items: center; padding: 16rpx 32rpx;
  padding-top: calc(60rpx + var(--status-bar-height, 48rpx));
  background: #fff; flex-shrink: 0;
  min-height: 100rpx;
  position: sticky; top: 0; z-index: 100;
  border-bottom: 1rpx solid #f0f0f0;
}
.back-btn { display: flex; align-items: center; padding: 8rpx 16rpx; background: rgba(229,57,53,0.1); border-radius: 16rpx; }
.back-btn:active { opacity: 0.7; }
.back-icon { font-size: 40rpx; color: #E53935; margin-right: 4rpx; }
.back-text { font-size: 24rpx; color: #E53935; }
.top-title { font-size: 30rpx; color: #333; font-weight: bold; margin-left: 20rpx; }

.loading-wrap { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 60vh; }
.loading-spinner {
  width: 48rpx; height: 48rpx; border: 3rpx solid rgba(229,57,53,0.3);
  border-top-color: #E53935; border-radius: 50%;
  animation: spin 1s linear infinite; margin-bottom: 20rpx;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { color: #999; font-size: 24rpx; }

.hero-section { position: relative; }
.backdrop { width: 100%; height: 240rpx; filter: blur(4rpx); }
.backdrop-mask {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, rgba(245,245,245,0.3), rgba(245,245,245,0.95));
}
.hero-content {
  position: absolute; bottom: 20rpx; left: 0; right: 0;
  display: flex; padding: 0 32rpx;
}
.poster { width: 180rpx; height: 260rpx; border-radius: 16rpx; flex-shrink: 0; z-index: 1; }
.hero-info { flex: 1; margin-left: 24rpx; display: flex; flex-direction: column; justify-content: flex-end; }
.title { font-size: 36rpx; font-weight: bold; color: #333; margin-bottom: 8rpx; }
.meta-row { display: flex; align-items: center; margin-bottom: 6rpx; }
.meta-item { font-size: 24rpx; color: #666; }
.meta-dot { margin: 0 10rpx; color: #999; }
.score-badge { align-self: flex-start; display: flex; align-items: center; gap: 6rpx; margin-top: 12rpx; padding: 6rpx 16rpx; background: #2E7D32; border-radius: 8rpx; }
.score-icon { font-size: 18rpx; }
.score-source { font-size: 20rpx; color: rgba(255,255,255,0.85); margin-right: 4rpx; }
.score-num { font-size: 30rpx; font-weight: bold; color: #fff; }
.score-label { font-size: 20rpx; color: rgba(255,255,255,0.8); }

.desc-section { padding: 20rpx 32rpx; }
.desc-label { font-size: 28rpx; color: #999; display: block; margin-bottom: 10rpx; }
.desc-content { padding: 16rpx; background: #fff; border-radius: 16rpx; }
.desc-content:active { background: #f0f0f0; }
.desc-text { font-size: 26rpx; color: #666; line-height: 1.7; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.desc-text.expanded { display: block; -webkit-line-clamp: unset; }
.desc-toggle { display: block; font-size: 24rpx; color: #E53935; margin-top: 10rpx; text-align: right; }

.action-row { display: flex; gap: 16rpx; padding: 0 32rpx; margin-top: 20rpx; }
.btn-play { flex: 2; text-align: center; padding: 20rpx 0; background: #E53935; border-radius: 16rpx; }
.btn-play:active { opacity: 0.8; }
.btn-play text { font-size: 30rpx; color: #fff; font-weight: bold; }
.btn-collect { flex: 1; text-align: center; padding: 20rpx 0; background: #fff; border-radius: 16rpx; }
.btn-collect:active { opacity: 0.8; }
.btn-collect text { font-size: 28rpx; color: #666; }
.btn-collect.collected { background: rgba(229,57,53,0.1); border: 1rpx solid #E53935; }
.btn-collect.collected text { color: #E53935; }

.route-section { padding: 20rpx 32rpx 0; }
.route-scroll { white-space: nowrap; }
.route-chip { display: inline-block; padding: 10rpx 28rpx; margin-right: 12rpx; background: #fff; border-radius: 16rpx; }
.route-chip:active { background: #f0f0f0; }
.route-chip.active { background: rgba(229,57,53,0.1); border: 1rpx solid #E53935; }
.route-chip text { font-size: 24rpx; color: #666; }
.route-chip.active text { color: #E53935; }

.episode-section { padding: 20rpx 32rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; display: block; margin-bottom: 16rpx; }
.episode-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.ep-item { min-width: 110rpx; padding: 12rpx 22rpx; text-align: center; background: #fff; border-radius: 16rpx; border: 1rpx solid transparent; }
.ep-item:active { background: #f0f0f0; }
.ep-item.active { background: rgba(229,57,53,0.1); border-color: #E53935; }
.ep-item.history { border-color: rgba(229,57,53,0.3); }
.ep-text { font-size: 24rpx; color: #666; }
.ep-item.active .ep-text { color: #E53935; font-weight: bold; }

.ep-group { margin-bottom: 20rpx; }
.ep-group-header { display: flex; align-items: center; gap: 8rpx; padding: 14rpx 20rpx; background: #fff; border-radius: 16rpx; margin-bottom: 12rpx; }
.ep-group-header:active { background: #f0f0f0; }
.ep-group-arrow { font-size: 20rpx; color: #E53935; }
.ep-group-label { font-size: 26rpx; color: #333; font-weight: bold; }
.ep-group-count { font-size: 22rpx; color: #999; }

.recommend-section { padding: 20rpx 32rpx 40rpx; }
.h-scroll { white-space: nowrap; }
.card { display: inline-block; width: 200rpx; background: #fff; border-radius: 16rpx; overflow: hidden; margin-right: 16rpx; }
.card:active { opacity: 0.8; }
.card-img { width: 200rpx; height: 280rpx; background: #e0e0e0; display: block; }
.card-title { display: block; padding: 10rpx 10rpx 2rpx; font-size: 24rpx; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-tag { display: block; padding: 0 10rpx 10rpx; font-size: 22rpx; color: #E53935; }

.safe-bottom { height: 40rpx; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 200rpx 0; }
.empty-text { color: #333; font-size: 30rpx; margin-bottom: 30rpx; }
.retry-btn { padding: 14rpx 48rpx; background: rgba(229,57,53,0.1); border-radius: 16rpx; border: 1rpx solid #E53935; }
.retry-btn:active { opacity: 0.7; }
.retry-btn text { color: #E53935; font-size: 26rpx; }

/* 续播弹窗 */
.resume-modal {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
.resume-card {
  width: 560rpx; background: #fff; border-radius: 24rpx;
  padding: 48rpx 40rpx 36rpx; text-align: center;
}
.resume-title { font-size: 34rpx; font-weight: bold; color: #333; display: block; margin-bottom: 12rpx; }
.resume-sub { font-size: 26rpx; color: #999; display: block; margin-bottom: 36rpx; }
.resume-btns { display: flex; gap: 20rpx; }
.resume-btn {
  flex: 1; padding: 20rpx 0; border-radius: 16rpx; text-align: center;
}
.resume-btn text { font-size: 28rpx; }
.resume-btn--cancel { background: #f0f0f0; }
.resume-btn--cancel text { color: #666; }
.resume-btn--confirm { background: #E53935; }
.resume-btn--confirm text { color: #fff; font-weight: bold; }
</style>
