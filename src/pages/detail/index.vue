<template>
  <view class="page">
    <!-- 返回按钮 -->
    <BackButton />

    <!-- 加载状态 -->
    <view class="loading-wrap" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 详情内容 -->
    <view class="detail-content" v-else-if="detail">
      <!-- 左侧海报区 -->
      <view class="poster-section">
        <image class="poster-img" :src="detail.vod_pic || defaultPic" mode="aspectFill" lazy-load />
        <view class="rating-badge" v-if="detail.vod_score">
          <text class="rating-num">{{ detail.vod_score }}</text>
          <text class="rating-label">评分</text>
        </view>
      </view>

      <!-- 右侧信息区 -->
      <view class="info-section">
        <text class="title">{{ detail.vod_name }}</text>
        <view class="meta-row">
          <text class="meta-item">{{ detail.vod_year || '未知' }}</text>
          <text class="meta-dot">·</text>
          <text class="meta-item">{{ detail.vod_area || '未知' }}</text>
          <text class="meta-dot">·</text>
          <text class="meta-item">{{ detail.vod_class || '未分类' }}</text>
        </view>
        <view class="actor-row" v-if="detail.vod_actor">
          <text class="actor-label">主演：</text>
          <text class="actor-text">{{ detail.vod_actor }}</text>
        </view>
        <view class="actor-row" v-if="detail.vod_director">
          <text class="actor-label">导演：</text>
          <text class="actor-text">{{ detail.vod_director }}</text>
        </view>
        <view class="desc-section">
          <text class="desc-label">剧情简介</text>
          <view class="desc-content" @click="toggleDesc" :focusable="true">
            <text :class="['desc-text', descExpanded ? 'expanded' : '']">
              {{ detail.vod_content || '暂无简介' }}
            </text>
            <text class="desc-toggle">{{ descExpanded ? '收起' : '展开' }}</text>
          </view>
        </view>
        <view class="action-row">
          <view class="btn-play" @click="playFirst" :focusable="true">
            <text class="btn-icon">▶</text>
            <text class="btn-text">立即播放</text>
          </view>
          <view :class="['btn-collect', collected ? 'collected' : '']" @click="toggleCollect" :focusable="true">
            <text class="btn-icon">{{ collected ? '★' : '☆' }}</text>
            <text class="btn-text">{{ collected ? '已收藏' : '收藏' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 选集区域 - 多行网格 -->
    <view class="episode-section" v-if="episodeList.length > 0">
      <view class="section-header">
        <text class="section-title">选集 (共{{ episodeList.length }}集)</text>
        <view class="route-tabs" v-if="routeList.length > 1">
          <view
            v-for="(route, i) in routeList"
            :key="i"
            :class="['route-tab', activeRoute === i ? 'active' : '']"
            @click="switchRoute(i)"
            :focusable="true"
          >
            <text class="route-text">{{ route }}</text>
          </view>
        </view>
      </view>

      <!-- 集数≤25: 直接平铺（短剧不走分组） -->
      <template v-if="!needsGrouping">
        <view class="episode-grid">
          <view
            v-for="(ep, i) in episodeList"
            :key="i"
            :class="episodeItemClass(i)"
            @click="playEpisode(i)"
            :focusable="true"
          >
            <text class="episode-text">{{ ep.name }}</text>
          </view>
        </view>
      </template>

      <!-- 集数>25: 分组折叠 -->
      <template v-else>
        <view v-for="(group, gi) in epGroups" :key="gi" class="ep-group">
          <view
            class="ep-group-header"
            @click="toggleGroup(gi)"
            :focusable="true"
          >
            <text class="ep-group-arrow">{{ expandedGroups[gi] ? '▼' : '▶' }}</text>
            <text class="ep-group-label">{{ group.label }}</text>
            <text class="ep-group-count">({{ group.items.length }}集)</text>
          </view>
          <view class="episode-grid" v-show="expandedGroups[gi]">
            <view
              v-for="(ep, localIdx) in group.items"
              :key="localIdx"
              :class="episodeItemClass(gi * groupSize + localIdx)"
              @click="playEpisode(gi * groupSize + localIdx)"
              :focusable="true"
            >
              <text class="episode-text">{{ ep.name }}</text>
            </view>
          </view>
        </view>
      </template>
    </view>

    <!-- 猜你喜欢 -->
    <view class="recommend-section" v-if="recommendList.length">
      <view class="section-header">
        <text class="section-title">猜你喜欢</text>
      </view>
      <scroll-view scroll-x class="h-scroll" :focusable="false">
        <view v-for="item in recommendList" :key="item.vod_id" class="card" :focusable="true" @click="goDetail(item.vod_id)">
          <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load />
          <text class="card-title">{{ item.vod_name }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 空状态 -->
    <view class="empty-wrap" v-if="!loading && !detail">
      <text class="empty-icon">🎬</text>
      <text class="empty-text">抱歉，该内容暂不可用</text>
      <text class="empty-sub">请稍后再试或浏览其他内容</text>
      <view class="retry-btn" @click="loadDetail" :focusable="true"><text>🔄 重新加载</text></view>
    </view>
  </view>
</template>

<script>
import { getVodDetail, getVodList } from "@/api/vod"
import { DEFAULT_PIC, fixPicUrl } from "@/api/config"
import { autoFocus } from "@/utils/focus"
import { parseEpisodeCount, saveEpCache } from "@/utils/epCache"
import { store } from "@/store"
import BackButton from "@/components/BackButton.vue"

export default {
  components: { BackButton },
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
      // 选集分组折叠 (每25集一组)
      groupSize: 25,
      expandedGroups: {},
    }
  },
  computed: {
    epGroups() {
      const groups = []
      for (let i = 0; i < this.episodeList.length; i += this.groupSize) {
        const end = Math.min(i + this.groupSize, this.episodeList.length)
        groups.push({
          label: `第${i + 1}-${end}集`,
          items: this.episodeList.slice(i, end),
          groupIndex: groups.length
        })
      }
      return groups
    },
    needsGrouping() {
      return this.episodeList.length > this.groupSize
    }
  },
  onLoad(options) {
    if (options.id) {
      this.vodId = Number(options.id)
      this.loadDetail()
      this.loadHistory()
      this.loadCollectStatus()
    }
  },
  onReady() {
    this.$nextTick(() => autoFocus(this.$el))
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
        }
      } catch (e) { console.error("loadDetail fail", e) }
      this.loading = false
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
      // 缓存真实集数，供分类页纠正 vod_remarks
      this.cacheRealEpisodeCount()
    },
    cacheRealEpisodeCount() {
      // 使用共享工具函数，确保 key 格式一致
      const maxCount = parseEpisodeCount(this.detail)
      if (maxCount > 0) {
        saveEpCache(this.vodId, maxCount, this.detail.vod_name)
      }
    },
    switchRoute(index) {
      this.activeRoute = index
      const routeUrl = this.routeUrls[index] || ""
      const episodes = routeUrl.split("#").filter(e => e)
      this.episodeList = episodes.map((ep, i) => {
        const idx = ep.indexOf("$")
        if (idx >= 0) {
          return { name: ep.substring(0, idx) || `第${i+1}集`, url: ep.substring(idx+1) }
        }
        return { name: `第${i+1}集`, url: ep }
      })
      const history = this.getPlayHistory()
      if (history && history.episode >= 0 && history.episode < this.episodeList.length) {
        this.historyEp = history.episode
        this.currentEp = history.episode
      } else {
        this.currentEp = 0
        this.historyEp = -1
      }
      this.autoExpandGroup()
    },
    toggleGroup(gi) {
      this.$set(this.expandedGroups, gi, !this.expandedGroups[gi])
    },
    episodeItemClass(globalIdx) {
      return [
        'episode-item',
        this.currentEp === globalIdx ? 'active' : '',
        this.historyEp === globalIdx ? 'history' : ''
      ]
    },
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
    loadHistory() {
      const history = this.getPlayHistory()
      if (history) this.historyEp = history.episode
    },
    getPlayHistory() {
      return store.getHistory(this.vodId)
    },
    loadCollectStatus() {
      this.collected = store.isCollected(this.vodId)
    },
    fixItem(item) {
      return { ...item, vod_pic: this.fixPicUrl(item.vod_pic), vod_content: this.stripHtml(item.vod_content) }
    },
    fixPicUrl,
    stripHtml(html) {
      if (!html) return ""
      return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
    },
    toggleDesc() { this.descExpanded = !this.descExpanded },
    toggleCollect() {
      const item = {
        vod_id: this.vodId,
        vod_name: this.detail.vod_name,
        vod_pic: this.detail.vod_pic,
        vod_remarks: this.detail.vod_remarks,
        type_id: this.detail.type_id || this.detail.type_id_1,
        totalEp: this.episodeList.length
      }
      this.collected = store.toggleCollect(item)
      // 电视剧收藏时自动加入追剧列表
      if (this.collected && this.detail.type_id === 2) {
        if (!store.isFollowing(this.vodId)) {
          store.toggleFollow(item)
        }
      }
      // 取消收藏时也移除追剧
      if (!this.collected) {
        if (store.isFollowing(this.vodId)) {
          store.toggleFollow(item)
        }
      }
    },
    playFirst() {
      if (this.episodeList.length > 0) {
        this.playEpisode(this.historyEp >= 0 ? this.historyEp : 0)
      } else {
        uni.showToast({ title: "暂无播放源", icon: "none" })
      }
    },
    playEpisode(index) {
      if (index < 0 || index >= this.episodeList.length) return
      this.currentEp = index
      const ep = this.episodeList[index]
      uni.navigateTo({
        url: `/pages/player/index?id=${this.vodId}&ep=${index}&title=${encodeURIComponent(this.detail.vod_name)}&url=${encodeURIComponent(ep.url)}`
      })
    },
    goDetail(id) { uni.navigateTo({ url: `/pages/detail/index?id=${id}` }) }
  }
}
</script>

<style scoped>
.page {
  background: linear-gradient(135deg, #0a1628 0%, #0f1a2a 50%, #0a1628 100%);
  min-height: 100vh;
  padding: 60rpx;
}

/* 返回按钮 */
.back-btn {
  position: fixed; top: 40rpx; left: 40rpx; z-index: 100;
}

/* 加载状态 */
.loading-wrap { display: flex; justify-content: center; align-items: center; height: 80vh; }
.loading-text { color: #666; font-size: 32rpx; }

/* 详情内容 */
.detail-content { display: flex; flex-direction: row; padding: 80rpx 0 40rpx; }
.poster-section { width: 420rpx; flex-shrink: 0; position: relative; }
.poster-img { width: 420rpx; height: 600rpx; border-radius: 20rpx; background: #1a2a3a; }
.rating-badge { position: absolute; top: 20rpx; right: 20rpx; background: linear-gradient(135deg, #ff6b35, #ff4757); padding: 16rpx 24rpx; border-radius: 12rpx; text-align: center; }
.rating-num { display: block; font-size: 40rpx; font-weight: bold; color: #fff; }
.rating-label { display: block; font-size: 20rpx; color: rgba(255,255,255,0.8); }

.info-section { flex: 1; margin-left: 60rpx; }
.title { display: block; font-size: 56rpx; font-weight: bold; color: #fff; margin-bottom: 24rpx; }
.meta-row { display: flex; align-items: center; margin-bottom: 24rpx; }
.meta-item { font-size: 28rpx; color: #8aa; }
.meta-dot { margin: 0 16rpx; color: #556; }
.actor-row { display: flex; margin-bottom: 20rpx; }
.actor-label { font-size: 26rpx; color: #688; width: 120rpx; flex-shrink: 0; }
.actor-text { font-size: 26rpx; color: #aac; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.desc-section { margin-top: 30rpx; }
.desc-label { display: block; font-size: 28rpx; color: #688; margin-bottom: 16rpx; }
.desc-content { padding: 20rpx; background: rgba(0,212,255,0.08); border-radius: 12rpx; border: 1rpx solid rgba(0,212,255,0.15); transition: all 0.2s ease; }
.desc-content:focus { transform: scale(1.02); background: rgba(0,212,255,0.12); }
.desc-text { font-size: 26rpx; color: #aac; line-height: 1.8; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.desc-text.expanded { display: block; -webkit-line-clamp: unset; }
.desc-toggle { display: block; font-size: 24rpx; color: #00d4ff; margin-top: 16rpx; text-align: right; }

.action-row { display: flex; gap: 30rpx; margin-top: 40rpx; }
.btn-play, .btn-collect { display: flex; align-items: center; padding: 24rpx 60rpx; border-radius: 16rpx; transition: all 0.2s ease; }
.btn-play { background: linear-gradient(135deg, #00d4ff, #00a8ff); }
.btn-play:focus { transform: scale(1.08); box-shadow: 0 0 40rpx rgba(0,212,255,0.6); }
.btn-collect { background: rgba(255,255,255,0.1); border: 2rpx solid rgba(255,255,255,0.2); }
.btn-collect:focus { transform: scale(1.08); border-color: #00d4ff; }
.btn-collect.collected { background: rgba(255,180,0,0.2); border-color: #ffb400; }
.btn-icon { font-size: 36rpx; margin-right: 16rpx; }
.btn-text { font-size: 32rpx; color: #fff; }
.btn-play .btn-icon { color: #fff; }
.btn-play .btn-text { color: #fff; font-weight: bold; }

/* 选集区域 */
.episode-section { margin-top: 40rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.section-title { font-size: 36rpx; font-weight: bold; color: #fff; }

/* 线路切换 */
.route-tabs { display: flex; gap: 16rpx; }
.route-tab { padding: 12rpx 32rpx; background: rgba(255,255,255,0.1); border-radius: 8rpx; border: 1rpx solid rgba(255,255,255,0.15); transition: all 0.2s ease; }
.route-tab:focus, .route-tab.active { background: rgba(0,212,255,0.2); border-color: #00d4ff; }
.route-tab.active .route-text { color: #00d4ff; }
.route-text { font-size: 26rpx; color: #8aa; }

/* 分组折叠 */
.ep-group {
  margin-bottom: 28rpx;
}
.ep-group-header {
  display: flex; align-items: center;
  gap: 12rpx;
  padding: 22rpx 28rpx;
  background: rgba(255,255,255,0.06);
  border-radius: 12rpx;
  border: 2rpx solid rgba(255,255,255,0.1);
  transition: all 0.2s ease;
  margin-bottom: 16rpx;
}
.ep-group-header:focus {
  background: rgba(0,212,255,0.15);
  border-color: #00d4ff;
  transform: scale(1.03);
}
.ep-group-arrow {
  font-size: 22rpx; color: #00d4ff;
  width: 30rpx; text-align: center;
}
.ep-group-label {
  font-size: 28rpx; color: #e0e0e0;
  font-weight: bold;
}
.ep-group-count {
  font-size: 24rpx; color: #688;
}

/* 多行网格选集 */
.episode-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.episode-item {
  min-width: 140rpx;
  padding: 16rpx 28rpx;
  background: rgba(255,255,255,0.08);
  border-radius: 10rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
  text-align: center;
}
.episode-item:focus { transform: scale(1.08); background: rgba(0,212,255,0.2); border-color: #00d4ff; }
.episode-item.active { background: rgba(0,212,255,0.3); border-color: #00d4ff; }
.episode-item.history { border-color: rgba(255,180,0,0.5); }
.episode-text { font-size: 30rpx; color: #ccc; }
.episode-item.active .episode-text { color: #00d4ff; font-weight: bold; }

/* 猜你喜欢 */
.recommend-section { margin-top: 50rpx; }
.h-scroll { white-space: nowrap; }
.card { display: inline-block; width: 240rpx; margin-right: 30rpx; vertical-align: top; white-space: normal; background: rgba(20,40,60,0.6);   border-radius: 16rpx; overflow: hidden; border: 3rpx solid transparent; transition: transform 0.15s ease-out, box-shadow 0.15s ease-out; }
.card:focus { transform: scale(1.08); box-shadow: 0 0 0 3rpx #00d4ff, 0 0 30rpx rgba(0,212,255,0.6); }
.card-img { width: 240rpx; height: 340rpx; background: #1a2a3a; }
.card-title { display: block; padding: 16rpx; font-size: 30rpx; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 空状态 */
.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 200rpx 0; }
.empty-icon { font-size: 120rpx; margin-bottom: 30rpx; }
.empty-text { color: #fff; font-size: 36rpx; margin-bottom: 16rpx; }
.empty-sub { color: #666; font-size: 26rpx; margin-bottom: 40rpx; }
.retry-btn { padding: 20rpx 60rpx; background: rgba(0,212,255,0.2); border-radius: 12rpx; border: 2rpx solid #00d4ff; }
.retry-btn text { color: #00d4ff; font-size: 28rpx; }
</style>
