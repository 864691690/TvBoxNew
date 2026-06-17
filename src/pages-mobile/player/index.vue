<template>
<view class="player-page">
  <!-- 状态栏 -->
  <view class="status-bar">
    <view class="status-left">
      <text class="back-btn" @click="goBack">←</text>
    </view>
    <text class="video-title" selectable>{{ title }}</text>
    <view class="status-right"></view>
  </view>

  <!-- 视频容器 -->
  <view class="video-wrap" @click="onTap" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd" @touchcancel="onTouchEnd">
    <video
      id="myVideo"
      class="video-player"
      :src="playUrl"
      :initial-time="currentTime"
      :play-back-rate="currentSpeed"
      :autoplay="true"
      :loop="false"
      :show-center-play-btn="false"
      :show-fullscreen-btn="false"
      :show-play-btn="false"
      :show-progress="false"
      :enable-progress-gesture="true"
      :object-fit="isPortrait ? 'contain' : 'fill'"
      :muted="muted"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @error="onError"
      @waiting="onWaiting"
      @playing="onPlaying"
      @pause="onPause"
      @loadedmetadata="onLoadedMetadata"
      @fullscreenchange="onFullscreenChange"
    ></video>

    <!-- 加载中 -->
    <view class="loading-overlay" v-if="buffering || !playing">
      <view class="loading-spinner"></view>
      <text class="loading-text" v-if="errorMsg">{{ errorMsg }}</text>
      <text class="loading-text" v-else-if="buffering">加载中...</text>
    </view>

    <!-- 中间播放按钮 -->
    <view class="center-play-btn" v-if="!playing && !buffering" @click.stop="togglePlay">
      <view class="play-icon" v-html="playIcon"></view>
    </view>
  </view>

  <!-- 进度条（视频下方） -->
  <view class="progress-section">
    <text class="time-text">{{ formatTime(currentTime) }}</text>
    <view class="progress-bar-wrap" @click="onProgressTap">
      <view class="progress-bar-bg">
        <view class="progress-bar-buffered" :style="{ width: bufferedPercent + '%' }"></view>
        <view class="progress-bar-current" :style="{ width: (duration > 0 ? currentTime / duration * 100 : 0) + '%' }"></view>
      </view>
      <view class="progress-thumb" :style="{ left: (duration > 0 ? currentTime / duration * 100 : 0) + '%' }"></view>
    </view>
    <text class="time-text">{{ formatTime(duration) }}</text>
  </view>

  <!-- 快捷操作栏 -->
  <view class="quick-bar">
    <view class="quick-btn" @click="seekBackward">
      <view class="quick-icon" v-html="backwardIcon"></view>
      <text class="quick-label">后退</text>
    </view>
    <view class="quick-btn" @click="togglePlay">
      <view class="quick-icon" v-html="playing ? pauseIcon : playIcon"></view>
      <text class="quick-label">{{ playing ? '暂停' : '播放' }}</text>
    </view>
    <view class="quick-btn" @click="seekForward">
      <view class="quick-icon" v-html="forwardIcon"></view>
      <text class="quick-label">前进</text>
    </view>
    <view class="quick-btn" @click="prevEpisode" v-if="episodeList.length > 1">
      <view class="quick-icon" v-html="prevIcon"></view>
      <text class="quick-label">上一集</text>
    </view>
    <view class="quick-btn" @click="nextEpisode" v-if="episodeList.length > 1">
      <view class="quick-icon" v-html="nextIcon"></view>
      <text class="quick-label">下一集</text>
    </view>
  </view>

  <!-- 功能按钮行 -->
  <view class="action-bar">
    <view class="action-btn" @click="showEpisodePanel">
      <view class="action-icon" v-html="episodesIcon"></view>
      <text class="action-label">选集</text>
      <text class="action-sub" v-if="episodeList.length > 1">共{{ episodeList.length }}集</text>
    </view>
    <view class="action-btn" @click="showRoutePanel" v-if="routeList.length > 1">
      <view class="action-icon" v-html="routeIcon"></view>
      <text class="action-label">线路</text>
      <text class="action-sub">{{ routeList[activeRoute] || '' }}</text>
    </view>
    <view class="action-btn" @click="showSpeedPanel">
      <view class="action-icon" v-html="speedIcon"></view>
      <text class="action-label">倍速</text>
      <text class="action-sub">{{ currentSpeed }}x</text>
    </view>
    <view class="action-btn" @click="toggleFullscreen">
      <view class="action-icon" v-html="fullscreenIcon"></view>
      <text class="action-label">全屏</text>
    </view>
  </view>

  <!-- ==================== 选集面板 ==================== -->
  <view class="slide-panel" v-if="episodePanelVisible" @click.stop>
    <view class="panel-header">
      <text class="panel-title">选集播放</text>
      <view class="panel-close-btn" @click="hideAllPanels" v-html="closeIcon"></view>
    </view>
    <scroll-view scroll-y class="episode-scroll">
      <view class="episode-grid">
        <view
          class="ep-item"
          :class="{ 'ep-current': currentEp === i, 'ep-history': historyEp === i }"
          v-for="(ep, i) in episodeList"
          :key="i"
          @click="playEpisode(i)"
        >
          <text class="ep-num">{{ ep.name || ('第' + (i + 1) + '集') }}</text>
          <view class="ep-progress-bar" v-if="isEpisodeWatched(i) && getEpisodeProgress(i) < 0.95">
            <view class="ep-progress-fill" :style="{ width: (getEpisodeProgress(i) * 100) + '%' }"></view>
          </view>
          <view class="ep-status" v-if="currentEp === i" v-html="playIcon"></view>
          <view class="ep-status ep-done" v-else-if="isEpisodeWatched(i) && getEpisodeProgress(i) >= 0.95" v-html="checkIcon"></view>
        </view>
      </view>
    </scroll-view>
  </view>

  <!-- ==================== 线路面板 ==================== -->
  <view class="slide-panel" v-if="routePanelVisible" @click.stop>
    <view class="panel-header">
      <text class="panel-title">线路切换</text>
      <view class="panel-close-btn" @click="hideAllPanels" v-html="closeIcon"></view>
    </view>
    <scroll-view scroll-y class="episode-scroll">
      <view class="route-list">
        <view
          class="route-item"
          :class="{ 'route-current': activeRoute === i }"
          v-for="(name, i) in routeList"
          :key="i"
          @click="switchToRoute(i)"
        >
          <text class="route-name">{{ name }}</text>
          <text class="route-tag" v-if="activeRoute === i">当前</text>
        </view>
      </view>
    </scroll-view>
  </view>

  <!-- ==================== 倍速面板 ==================== -->
  <view class="slide-panel" v-if="speedPanelVisible" @click.stop>
    <view class="panel-header">
      <text class="panel-title">播放倍速</text>
      <view class="panel-close-btn" @click="hideAllPanels" v-html="closeIcon"></view>
    </view>
    <scroll-view scroll-y class="episode-scroll">
      <view class="route-list">
        <view
          class="route-item"
          :class="{ 'route-current': currentSpeed === s.value }"
          v-for="s in speedOptions"
          :key="s.value"
          @click="setSpeed(s.value)"
        >
          <text class="route-name">{{ s.label }}</text>
          <view class="route-tag" v-if="currentSpeed === s.value" v-html="checkIcon"></view>
        </view>
      </view>
    </scroll-view>
  </view>

  <!-- 遮罩层 -->
  <view class="mask-overlay" v-if="episodePanelVisible || routePanelVisible || speedPanelVisible" @click="hideAllPanels"></view>
  <video id="preloadVideo" :src="preloadingUrl" :autoplay="false" style="position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px;left:-9999px;" />

</view>
</template>

<script>
import { getVodDetail } from "@/api/vod"
import { fixPicUrl } from "@/api/config"
export default {
  data() {
    return {
      playIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
      pauseIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`,
      backwardIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>`,
      forwardIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>`,
      prevIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`,
      nextIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`,
      episodesIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`,
      routeIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`,
      speedIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
      fullscreenIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`,
      closeIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
      checkIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
      vodId: 0,
      title: '',
      vodPic: '',
      playUrl: '',
      routeList: [],
      routeUrls: [],
      activeRoute: 0,
      settingsPanelVisible: false,
      showSkipIntro: false,
      showSkipOutro: false,
      skipIntroDuration: 90,
      skipOutroDuration: 60,
      gestureState: {
        touching: false, startX: 0, startY: 0, seeking: false,
        gestureHint: '', gestureValue: 0,
        lastTapTime: 0, lastTapX: 0, lastTapY: 0,
        _tapTime: 0, _initBrightness: 0.5, _initVolume: 1,
        longPressTimer: null
      },
      preloadingUrl: '',
      preloadingReady: false,
      longPressSpeedActive: false,
      episodeList: [],
      currentEp: 0,
      historyEp: -1,
      playing: false,
      buffering: true,
      errorMsg: '',
      currentTime: 0,
      duration: 0,
      bufferedPercent: 0,
      controlVisible: true,
      controlTimer: null,
      episodePanelVisible: false,
      routePanelVisible: false,
      speedPanelVisible: false,
      currentSpeed: 1.0,
      speedOptions: [
        { label: '0.5x', value: 0.5 },
        { label: '0.75x', value: 0.75 },
        { label: '1.0x', value: 1.0 },
        { label: '1.25x', value: 1.25 },
        { label: '1.5x', value: 1.5 },
        { label: '2.0x', value: 2.0 }
      ],
      videoContext: null,
      isPortrait: true,
      isFullscreen: false,
      progressDragging: false,
      muted: false
    }
  },
  onLoad(options) {
    let params = {}
    try { params = JSON.parse(decodeURIComponent(options.params || '{}')) } catch {}
    // 支持两种传参：JSON params 或简单query参数
    this.vodId = params.vodId || options.id || options.vodId || 0
    this.title = params.title || decodeURIComponent(options.title || '') || '未知标题'
    this.vodPic = params.vodPic || decodeURIComponent(options.pic || '') || ''
    this.currentEp = params.epIndex !== undefined ? params.epIndex : (parseInt(options.ep) || 0)
    this.playUrl = params.url || decodeURIComponent(options.url || '') || ''
    this.routeList = params.sourceNames || ['默认线路']
    this.routeUrls = params.urls || [this.playUrl]
    this.episodeList = params.episodes || []
    this.activeRoute = 0
    this.playUrl = this.routeUrls[0] || this.playUrl
    if (this.episodeList.length === 0) {
      this.episodeList = [{ name: '第1集', url: this.playUrl }]
    }
    this.parseEpisodes(params.playFrom || decodeURIComponent(options.playFrom || ''), decodeURIComponent(options.playUrl || ''))
    if (this.vodId) this.loadDetail()
      try { this.gestureState._initBrightness = plus.screen.brightness || 0.5 } catch {}
      try { this.gestureState._initVolume = parseFloat(uni.getStorageSync('video_volume') || '1') } catch {}
  },
  onReady() {
    this.videoContext = uni.createVideoContext('myVideo', this)
    this.initBrightness()
    this.getPlayHistory()
    this.$nextTick(() => { this.checkResume() })
    uni.onKeyboardHeightChange(res => {})
  },
  onUnload() {
    this.saveProgress()
    if (this.controlTimer) clearTimeout(this.controlTimer)
  },
  onBackPress() {
    if (this.episodePanelVisible || this.routePanelVisible || this.speedPanelVisible) {
      this.hideAllPanels()
      return true
    }
    if (this.isFullscreen) {
      this.toggleFullscreen()
      return true
    }
    this.saveProgress()
    return false
  },
  methods: {
    goBack() {
      this.saveProgress()
      uni.navigateBack()
    },
    async loadDetail() {
      try {
        const res = await getVodDetail(this.vodId)
        console.log('[loadDetail] API响应:', JSON.stringify(res).substring(0, 500))
        if (res.list && res.list.length > 0) {
          const detail = res.list[0]
          console.log('[loadDetail] vod_play_from:', detail.vod_play_from)
          console.log('[loadDetail] vod_play_url:', detail.vod_play_url ? detail.vod_play_url.substring(0, 200) : 'null')
          if (!this.title || this.title === '未知标题') this.title = detail.vod_name || this.title
          this.vodPic = fixPicUrl(detail.vod_pic || '')
          this.parseEpisodes(detail.vod_play_from, detail.vod_play_url)
        }
      } catch (e) { console.error('loadDetail fail', e) }
    },
    parseEpisodes(playFrom, playUrl) {
      if (!playUrl) return
      const routes = (playFrom || '').split('$$$').filter(r => r)
      const urlRoutes = playUrl.split('$$$')
      this.routeList = routes.length > 0 ? routes : ['默认线路']
      this.routeUrls = urlRoutes
      this.updateEpisodes()
    },
    updateEpisodes() {
      const routeUrl = this.routeUrls[this.activeRoute] || ''
      console.log('[updateEpisodes] activeRoute:', this.activeRoute, 'routeUrl:', routeUrl ? routeUrl.substring(0, 100) : 'empty')
      const episodes = routeUrl.split('#').filter(e => e)
      this.episodeList = episodes.map((ep, i) => {
        const [name, url] = ep.split('$')
        return { name: name || ('第' + (i + 1) + '集'), url: url || ep }
      })
      console.log('[updateEpisodes] episodeList count:', this.episodeList.length, 'first:', this.episodeList[0])
      if (this.episodeList[this.currentEp]) {
        this.playUrl = this.episodeList[this.currentEp].url
        console.log('[updateEpisodes] 设置 playUrl:', this.playUrl ? this.playUrl.substring(0, 80) : 'empty')
      }
    },

    checkResume() {
      const history = uni.getStorageSync('play_history_' + this.vodId)
      if (history && history.url === this.playUrl) {
        if (history.position && history.position > 30 && history.position < (history.duration || 0) * 0.95) {
          this.currentTime = history.position
          uni.showModal({
            title: '续播提示',
            content: '上次看到 ' + this.formatTime(history.position) + '，是否继续？',
            confirmText: '继续',
            cancelText: '从头',
            success: res => {
              if (!res.confirm) { this.currentTime = 0 }
              this.historyEp = history.epIndex >= 0 ? history.epIndex : -1
            }
          })
        } else {
          this.historyEp = history.epIndex >= 0 ? history.epIndex : -1
        }
      }
    },
    getPlayHistory() {
      const history = uni.getStorageSync('play_history_' + this.vodId)
      if (history) this.historyEp = history.epIndex >= 0 ? history.epIndex : -1
    },
    resumePlay() {
      if (this.currentTime > 0 && this.videoContext) {
        this.$nextTick(() => { this.videoContext.seek(this.currentTime) })
      }
    },
    playFromStart() {
      this.currentTime = 0
      if (this.videoContext) this.videoContext.seek(0)
    },
    onTap() {
      if (this.episodePanelVisible || this.routePanelVisible || this.speedPanelVisible || this.settingsPanelVisible) return
      this.controlVisible = !this.controlVisible
      if (this.controlVisible) this.showControlBar()
    },
    onTouchStart(e) {
      const touch = e.touches[0]
      if (!touch) return
      const now = Date.now()
      const gs = this.gestureState
      gs.touching = true
      gs.startX = touch.clientX
      gs.startY = touch.clientY
      gs.startTime = now
      gs.seeking = false
      gs.lastTapTime = gs._tapTime || 0
      gs._tapTime = now
      gs.lastTapX = touch.clientX
      gs.lastTapY = touch.clientY
      if (gs.longPressTimer) clearTimeout(gs.longPressTimer)
      gs.longPressTimer = setTimeout(() => {
        if (gs.touching) this.activateLongPressSpeed()
      }, 500)
    },
    onTouchMove(e) {
      const touch = e.touches[0]
      if (!touch || !this.gestureState.touching) return
      const gs = this.gestureState
      const dx = touch.clientX - gs.startX
      const dy = touch.clientY - gs.startY
      const elapsed = Date.now() - gs.startTime
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        if (gs.longPressTimer) { clearTimeout(gs.longPressTimer); gs.longPressTimer = null }
      }
      if (elapsed < 100) return
      if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
        gs.seeking = true
        const w = window.innerWidth || 375
        const h = window.innerHeight || 667
        if (Math.abs(dx) > Math.abs(dy) * 1.5) {
          gs.gestureHint = 'seek'
          gs.gestureValue = Math.round(dx / 5)
          const target = Math.max(0, Math.min(this.currentTime + gs.gestureValue, this.duration))
          if (this.videoContext) this.videoContext.seek(target)
        } else if (dy > 20) {
          if (touch.clientX < w / 2) {
            gs.gestureHint = 'brightness'
            gs.gestureValue = Math.max(0, Math.min(1, gs._initBrightness - dy / (h * 0.5)))
            try { plus.screen.setBrightness && plus.screen.setBrightness(gs.gestureValue) } catch {}
          } else {
            gs.gestureHint = 'volume'
            gs.gestureValue = Math.max(0, Math.min(1, gs._initVolume - dy / (h * 0.5)))
            uni.setStorageSync('video_volume', gs.gestureValue)
          }
        }
      }
    },
    onTouchEnd(e) {
      const gs = this.gestureState
      if (!gs.touching) return
      gs.touching = false
      if (gs.longPressTimer) { clearTimeout(gs.longPressTimer); gs.longPressTimer = null }
      const elapsed = Date.now() - gs.startTime
      const dx = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : gs.lastTapX) - gs.startX
      const dy = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : gs.lastTapY) - gs.startY
      const totalDist = Math.sqrt(dx * dx + dy * dy)
      const now = Date.now()
      if (totalDist < 100 && elapsed < 300 && (now - gs.lastTapTime) < 350) {
        this.onDoubleTap(); gs.gestureHint = ''; return
      }
      setTimeout(() => { this.gestureState.gestureHint = '' }, 400)
    },
    onDoubleTap() {
      const touchX = this.gestureState.lastTapX
      const w = window.innerWidth || 375
      if (touchX < w / 2) {
        if (this.videoContext) this.videoContext.seek(Math.max(0, this.currentTime - 5))
        uni.showToast({ title: '-5秒', icon: 'none', duration: 500 })
      } else {
        if (this.videoContext) this.videoContext.seek(Math.min(this.duration, this.currentTime + 10))
        uni.showToast({ title: '+10秒', icon: 'none', duration: 500 })
      }
    },
    activateLongPressSpeed() {
      if (this.longPressSpeedActive) return
      this.longPressSpeedActive = true
      const orig = this.currentSpeed
      this.setSpeed(2.0)
      uni.showToast({ title: '2.0x', icon: 'none', duration: 2000 })
      setTimeout(() => {
        if (this.longPressSpeedActive) {
          this.longPressSpeedActive = false
          this.setSpeed(orig)
        }
      }, 3000)
    },
    togglePiP() {
      try {
        if (this.videoContext && this.videoContext.requestPictureInPicture) {
          this.videoContext.requestPictureInPicture()
          uni.showToast({ title: '画中画', icon: 'none', duration: 1000 })
        } else { uni.showToast({ title: '当前设备不支持画中画', icon: 'none', duration: 1500 }) }
      } catch(e) { uni.showToast({ title: '画中画不可用', icon: 'none', duration: 1500 }) }
    },
    onTimeUpdate(e) {
      if (this.progressDragging) return
      this.currentTime = e.detail.currentTime || 0
      this.duration = e.detail.duration || 0
      if (this.duration > 0) {
        const buffered = e.detail.buffered
        if (buffered && buffered.length > 0) {
          this.bufferedPercent = (buffered[buffered.length - 1] / this.duration) * 100
        }
      }
    },
    onEnded() {
      this.playing = false
      this.saveProgress()
      if (this.currentEp < this.episodeList.length - 1) {
        uni.showToast({ title: '自动播放下一集', icon: 'none', duration: 1200 })
        setTimeout(() => { this.nextEpisode() }, 1200)
      }
    },
    startNextEpisodeCountdown() {},
    cancelNextEpisode() {},
    doNextEpisode() {},
    onError(e) {
      this.buffering = false
      this.playing = false
      this.errorMsg = '播放出错，尝试换线路'
    },
    onLoadedMetadata(e) {
      this.duration = e.detail.duration || 0
      this.buffering = false
      this.playing = true
      this.$nextTick(() => { this.resumePlay() })
    },
    onFullscreenChange(e) {
      const entering = e.detail.fullScreen;
      this.isFullscreen = entering;
      // 进入全屏时，延迟重建UI，避免和系统全屏动画冲突
      if (entering) {
        this.controlVisible = false;
        this.$nextTick(() => {
          setTimeout(() => { this.controlVisible = true }, 300);
        });
      }
    },
    autoSwitchRoute() {},
    onWaiting() { this.buffering = true },
    onPlaying() {
      this.buffering = false
      this.playing = true
    },
    onPause() {
      this.playing = false
      this.saveProgress()
    },
    onPlay() { this.playing = true },
    seekForward() {
      if (!this.duration) return
      const t = Math.min(this.currentTime + 10, this.duration - 1)
      this.videoContext && this.videoContext.seek(t)
      uni.vibrateShort && uni.vibrateShort()
    },
    seekBackward() {
      if (!this.duration) return
      const t = Math.max(this.currentTime - 10, 0)
      this.videoContext && this.videoContext.seek(t)
      uni.vibrateShort && uni.vibrateShort()
    },
    onProgressTap(e) {
      if (!this.duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = (e.detail.x || e.clientX - rect.left) / rect.width
      const t = Math.max(0, Math.min(ratio * this.duration, this.duration))
      this.videoContext && this.videoContext.seek(t)
    },
    togglePlay() {
      if (!this.videoContext) return
      if (this.playing) {
        this.videoContext.pause()
      } else {
        this.videoContext.play()
      }
    },
    prevEpisode() {
      if (this.currentEp > 0) this.playEpisode(this.currentEp - 1)
      else uni.showToast({ title: '已经是第一集', icon: 'none' })
    },
    nextEpisode() {
      if (this.currentEp < this.episodeList.length - 1) {
        if (this.currentEp + 2 < this.episodeList.length) {
          const nxt2 = this.episodeList[this.currentEp + 2]
          this.preloadingUrl = nxt2.url || nxt2.playUrl || ''
          this.preloadingReady = false
        }
        this.playEpisode(this.currentEp + 1)
      } else {
        uni.showToast({ title: '已经是最后一集', icon: 'none' })
      }
    },
    playEpisode(index) {
      if (index < 0 || index >= this.episodeList.length) return
      const ep = this.episodeList[index]
      this.currentEp = index
      this.historyEp = index
      const epUrl = ep.url || ep.playUrl || ''
      const usePreloaded = (this.preloadingUrl === epUrl && this.preloadingReady)
      this.playUrl = usePreloaded ? this.preloadingUrl : epUrl
      this.preloadingReady = false
      this.currentTime = 0
      this.buffering = true
      this.errorMsg = ''
      this.$nextTick(() => {
        if (this.videoContext) this.videoContext.src(this.playUrl)
        if (this.videoContext) this.videoContext.play()
      })
      if (index + 2 < this.episodeList.length) {
        const nxt = this.episodeList[index + 2]
        this.preloadingUrl = nxt.url || nxt.playUrl || ''
        this.preloadingReady = false
      }
      this.hideAllPanels()
      uni.showToast({ title: '切换到：' + (ep.name || ('第' + (index + 1) + '集')), icon: 'none', duration: 1000 })
    },
    showEpisodePanel() {
      this.hideAllPanels()
      this.episodePanelVisible = true
      this.controlVisible = false
    },
    showRoutePanel() {
      this.hideAllPanels()
      this.routePanelVisible = true
      this.controlVisible = false
    },
    showSpeedPanel() {
      this.hideAllPanels()
      this.speedPanelVisible = true
      this.controlVisible = false
    },
    hideAllPanels() {
      this.episodePanelVisible = false
      this.routePanelVisible = false
      this.speedPanelVisible = false
      this.controlVisible = true
    },
    switchToRoute(index) {
      if (index === this.activeRoute) { this.hideAllPanels(); return }
      this.activeRoute = index
      this.playUrl = this.routeUrls[index] || ''
      this.currentTime = 0
      this.buffering = true
      this.$nextTick(() => {
        if (this.videoContext) this.videoContext.src(this.playUrl)
        if (this.videoContext) this.videoContext.play()
      })
      this.hideAllPanels()
      uni.showToast({ title: '已切换到：' + (this.routeList[index] || ('线路' + (index + 1))), icon: 'none', duration: 1000 })
    },
    setSpeed(speed) {
      this.currentSpeed = speed
      this.$nextTick(() => {
        if (this.videoContext) this.videoContext.playbackRate(speed)
      })
      this.hideAllPanels()
      uni.showToast({ title: '倍速：' + speed + 'x', icon: 'none', duration: 1000 })
    },
    retryPlay() {
      this.buffering = true
      this.errorMsg = ''
      this.$nextTick(() => {
        if (this.videoContext) this.videoContext.play()
      })
    },
    showControlBar() {
      if (this.controlTimer) clearTimeout(this.controlTimer)
      this.controlTimer = setTimeout(() => {
        if (this.playing && !this.episodePanelVisible && !this.routePanelVisible && !this.speedPanelVisible) {
          this.controlVisible = false
        }
      }, 6000)
    },
    saveProgress() {
      if (!this.vodId || !this.playUrl) return
      const data = {
        url: this.playUrl,
        position: this.currentTime,
        duration: this.duration,
        epIndex: this.currentEp,
        title: this.title,
        vodPic: this.vodPic,
        updateTime: Date.now()
      }
      uni.setStorageSync('play_history_' + this.vodId, data)

      // 同步更新全局观看历史列表（mine 页面读取）
      try {
        let list = uni.getStorageSync('play_history')
        if (!Array.isArray(list)) list = []
        const idx = list.findIndex(h => h.vod_id === this.vodId)
        const record = {
          vod_id: this.vodId,
          vod_name: this.title,
          vod_pic: this.vodPic,
          url: this.playUrl,
          episode: this.currentEp,
          progress: this.currentTime,
          duration: this.duration,
          time: Date.now()
        }
        if (idx >= 0) {
          list[idx] = record
        } else {
          list.unshift(record)
        }
        // 限制最多 200 条
        if (list.length > 200) list = list.slice(0, 200)
        uni.setStorageSync('play_history', list)
      } catch (e) {
        console.error('[saveProgress] update global history error:', e)
      }
    },
    initBrightness() {
      try {
        const sys = uni.getSystemInfoSync()
        this.isPortrait = sys.screenWidth < sys.screenHeight
      } catch {}
    },
    onPlayerTouchStart(e) {},
    onPlayerTouchMove(e) {},
    onPlayerTouchEnd(e) {},
    showGestureOverlay() {},
    hideGestureOverlay() {},
    toggleFullscreen() {
      if (!this.videoContext) return
      if (this.isFullscreen) {
        this.videoContext.exitFullScreen()
      } else {
        this.videoContext.requestFullScreen({ direction: 0 })
      }
      // 不在这里改状态，交给 onFullscreenChange 事件统一处理
    },
    toggleOrientation() {
      this.toggleFullscreen()
    },
    onOrientationChange() {},
    checkPipSupport() { return false },
    enterPip() {},
    isEpisodeWatched(index) {
      const ep = this.episodeList[index]
      if (!ep) return false
      const epUrl = ep.url || ep.playUrl || ''
      if (!epUrl) return false
      const history = uni.getStorageSync('play_history')
      if (!Array.isArray(history)) return false
      return !!(history.find(h => h.vod_id === this.vodId && h.url === epUrl && h.progress > 30))
    },
    getEpisodeProgress(index) {
      const ep = this.episodeList[index]
      if (!ep) return 0
      const epUrl = ep.url || ep.playUrl || ''
      const history = uni.getStorageSync('play_history')
      if (!Array.isArray(history)) return 0
      const found = history.find(h => h.vod_id === this.vodId && h.url === epUrl)
      if (!found || !found.duration) return 0
      return Math.min(1, found.progress / found.duration)
    },
    formatTime(s) {
      if (!s || isNaN(s)) return '00:00'
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = Math.floor(s % 60)
      if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
/* ===== 页面基础 ===== */
.player-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #ffffff;
  display: flex;
  flex-direction: column;
}

/* ===== 状态栏 ===== */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: #111;
  height: 88rpx;
  box-sizing: content-box;
}
.status-left, .status-right { width: 120rpx; }
.back-btn {
  font-size: 40rpx;
  color: #fff;
  line-height: 1;
}
.video-title {
  flex: 1;
  text-align: center;
  font-size: 28rpx;
  color: #ddd;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 20rpx;
}

/* ===== 视频容器 ===== */
.video-wrap {
  width: 100%;
  position: relative;
  background: #000;
}
.video-player {
  width: 100%;
  height: 430rpx;
}
@media (orientation: landscape) {
  .video-player {
    height: 100vh;
  }
}

.loading-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  z-index: 10;
}
.loading-spinner {
  width: 60rpx; height: 60rpx;
  border: 4rpx solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { color: #ccc; font-size: 24rpx; margin-top: 20rpx; }

.center-play-btn {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 100rpx; height: 100rpx;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}
.play-icon { font-size: 44rpx; color: #fff; }

/* ===== 进度条 ===== */
.progress-section {
  display: flex;
  align-items: center;
  padding: 16rpx 30rpx;
  background: #111;
  gap: 16rpx;
}
.time-text { font-size: 22rpx; color: #aaa; min-width: 90rpx; text-align: center; }
.progress-bar-wrap {
  flex: 1;
  height: 50rpx;
  display: flex;
  align-items: center;
  position: relative;
}
.progress-bar-bg {
  width: 100%;
  height: 6rpx;
  background: #333;
  border-radius: 3rpx;
  overflow: hidden;
}
.progress-bar-buffered {
  height: 100%;
  background: #555;
  position: absolute;
  top: 0; left: 0;
  border-radius: 3rpx;
}
.progress-bar-current {
  height: 100%;
  background: linear-gradient(90deg, #ff4040, #ff6b6b);
  position: absolute;
  top: 0; left: 0;
  border-radius: 3rpx;
}
.progress-thumb {
  width: 24rpx; height: 24rpx;
  background: #ff4040;
  border-radius: 50%;
  position: absolute;
  top: 50%; transform: translate(-50%, -50%);
  z-index: 2;
}

/* ===== 快捷操作栏 ===== */
.quick-bar {
  display: flex;
  justify-content: space-around;
  padding: 20rpx 10rpx;
  background: #0d0d0d;
  border-bottom: 1rpx solid #1a1a1a;
}
.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
}
.quick-icon { font-size: 36rpx; }
.quick-label { font-size: 20rpx; color: #888; }

/* ===== 功能按钮行 ===== */
.action-bar {
  display: flex;
  justify-content: space-around;
  padding: 16rpx 0;
  background: #111;
}
.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  flex: 1;
  padding: 16rpx 0;
  background: #1a1a1a;
  margin: 0 8rpx;
  border-radius: 16rpx;
}
.action-icon { font-size: 36rpx; }
.action-label { font-size: 22rpx; color: #ddd; }
.action-sub { font-size: 18rpx; color: #666; max-width: 120rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ===== 面板通用 ===== */
.mask-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 90;
}
.slide-panel {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #1a1a1a;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 100;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 40rpx 20rpx;
  border-bottom: 1rpx solid #2a2a2a;
  flex-shrink: 0;
}
.panel-title { font-size: 30rpx; color: #fff; font-weight: bold; }
.panel-close-btn { font-size: 36rpx; color: #888; padding: 10rpx 20rpx; }
.episode-scroll { flex: 1; overflow: hidden; padding: 20rpx; }

/* ===== 选集网格 ===== */
.episode-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding-bottom: 40rpx;
}
.ep-item {
  width: calc(25% - 12rpx);
  aspect-ratio: 1.5;
  background: #2a2a2a;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  position: relative;
}
.ep-item:active { background: #3a3a3a; }
.ep-current { background: rgba(255, 64, 64, 0.2) !important; border: 2rpx solid #ff4040; }
.ep-history { border: 2rpx solid rgba(255, 64, 64, 0.4); }
.ep-num { font-size: 24rpx; color: #ccc; text-align: center; padding: 0 8rpx; }
.ep-current .ep-num { color: #ff4040; font-weight: bold; }
.ep-status { font-size: 18rpx; color: #ff4040; position: absolute; top: 4rpx; right: 8rpx; }

/* ===== 线路/倍速列表 ===== */
.route-list { display: flex; flex-direction: column; gap: 12rpx; padding-bottom: 40rpx; }
.route-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  background: #2a2a2a;
  border-radius: 12rpx;
}
.route-item:active { background: #3a3a3a; }
.route-current { background: rgba(255, 64, 64, 0.15) !important; border: 1rpx solid rgba(255, 64, 64, 0.3); }
.route-name { font-size: 28rpx; color: #ddd; }
.route-current .route-name { color: #ff4040; }
.route-tag { font-size: 24rpx; color: #ff4040; }
</style>
