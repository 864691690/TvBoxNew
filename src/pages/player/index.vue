<template>
  <view class="page" @click="onScreenClick">
    <!-- 播放器容器 -->
    <view class="player-container">
      <video
        v-if="playUrl"
        :src="playUrl"
        class="player-video"
        :autoplay="true"
        :controls="false"
        :show-center-play-btn="false"
        :show-play-btn="false"
        :show-progress="false"
        :show-fullscreen-btn="false"
        @timeupdate="onTimeUpdate"
        @ended="onEnded"
        @error="onError"
        @waiting="onWaiting"
        @playing="onPlaying"
        @play="onPlay"
        @pause="onPause"
        ref="videoPlayer"
        id="videoPlayer"
      />

      <!-- 缓冲遮罩 -->
      <view class="buffer-mask" v-if="buffering">
        <view class="loading-spinner"></view>
        <text class="buffer-text">缓冲中...</text>
      </view>

      <!-- 错误遮罩 -->
      <view class="error-mask" v-if="errorMsg">
        <text class="error-icon">⚠</text>
        <text class="error-text">{{ errorMsg }}</text>
        <view class="error-btns">
          <view class="retry-btn" @click="retryPlay" :focusable="true">
            <text>重试</text>
          </view>
          <view class="switch-btn" @click="autoSwitchRoute" :focusable="true" v-if="routeList.length > 1">
            <text>切换线路</text>
          </view>
        </view>
      </view>

      <!-- 快进/快退/音量提示 -->
      <view class="seek-hint" v-if="seekHintVisible">
        <text class="seek-hint-text" v-if="seekDirection === 'forward'">⏩ +{{ seekDelta }}秒</text>
        <text class="seek-hint-text" v-else-if="seekDirection === 'backward'">⏪ -{{ seekDelta }}秒</text>
        <text class="seek-hint-text" v-else-if="seekDirection === 'volume'">🔊 {{ seekDelta }}%</text>
      </view>
    </view>

    <!-- 控制栏（自动隐藏3秒） -->
    <view :class="['control-bar', controlVisible ? 'show' : 'hide']" @click.stop>
      <!-- 顶部信息 -->
      <view class="control-top">
        <view class="back-btn" @click="goBack" :focusable="true">
          <text class="back-icon">‹</text>
        </view>
        <text class="video-title">{{ title }}</text>
        <text class="episode-name">{{ episodeName }}</text>
      </view>

      <!-- 底部控制 -->
      <view class="control-bottom">
        <!-- 进度条 (TV: OK键+5s跳转，方向键用下方⏪⏩按钮) -->
        <view class="progress-section">
          <text class="time-text">{{ formatTime(currentTime) }}</text>
          <view class="progress-bar" :focusable="true" @click="seekTo">
            <view class="progress-buffered" :style="{ width: bufferedPercent + '%' }"></view>
            <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
            <view class="progress-dot" :style="{ left: progressPercent + '%' }"></view>
          </view>
          <text class="time-text">{{ formatTime(duration) }}</text>
        </view>

        <!-- 控制按钮 -->
        <view class="control-btns">
          <view class="ctrl-btn" @click="seekBackward" :focusable="true">
            <text class="ctrl-icon">⏪</text>
            <text class="ctrl-label">快退10s</text>
          </view>
          <view :class="['ctrl-btn', currentEp <= 0 ? 'disabled' : '']" @click="prevEpisode" :focusable="true" v-if="episodeList.length > 1">
            <text class="ctrl-icon">⏮</text>
            <text class="ctrl-label">上一集</text>
          </view>
          <view class="ctrl-btn play-btn" @click="togglePlay" :focusable="true">
            <text class="ctrl-icon">{{ playing ? '⏸' : '▶' }}</text>
            <text class="ctrl-label">{{ playing ? '暂停' : '播放' }}</text>
          </view>
          <view :class="['ctrl-btn', currentEp >= episodeList.length - 1 ? 'disabled' : '']" @click="nextEpisode" :focusable="true" v-if="episodeList.length > 1">
            <text class="ctrl-icon">⏭</text>
            <text class="ctrl-label">下一集</text>
          </view>
          <view class="ctrl-btn" @click="seekForward" :focusable="true">
            <text class="ctrl-icon">⏩</text>
            <text class="ctrl-label">快进10s</text>
          </view>
          <view class="ctrl-btn" @click="showEpisodePanel" :focusable="true" v-if="episodeList.length > 1">
            <text class="ctrl-icon">☰</text>
            <text class="ctrl-label">选集</text>
          </view>
          <view class="ctrl-btn" @click="showRoutePanel" :focusable="true" v-if="routeList.length > 1">
            <text class="ctrl-icon">📡</text>
            <text class="ctrl-label">线路</text>
          </view>
          <view class="ctrl-btn" @click="showSpeedPanel" :focusable="true">
            <text class="ctrl-icon">{{ speedLabel }}</text>
            <text class="ctrl-label">倍速</text>
          </view>
          <!-- P2-5: 音量控制 -->
          <view class="ctrl-btn" @click="toggleVolume" :focusable="true">
            <text class="ctrl-icon">🔊</text>
            <text class="ctrl-label">音量</text>
          </view>
          <!-- P5: 字幕开关 -->
          <view :class="['ctrl-btn', subtitleEnabled ? 'active' : '']" @click="toggleSubtitle" :focusable="true">
            <text class="ctrl-icon">{{ subtitleEnabled ? '💬' : '💭' }}</text>
            <text class="ctrl-label">{{ subtitleEnabled ? '字幕开' : '字幕关' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 选集面板 -->
    <view class="episode-panel" v-if="episodePanelVisible" @click.stop>
      <view class="panel-mask" @click="hideAllPanels" :focusable="true"></view>
      <view class="panel-content">
        <text class="panel-title">选集 (共{{ episodeList.length }}集)</text>
        <scroll-view scroll-y class="episode-grid">
          <view
            v-for="(ep, i) in episodeList"
            :key="i"
            :class="['ep-item', currentEp === i ? 'active' : '', historyEp === i ? 'history' : '']"
            @click="playEpisode(i)"
            :focusable="true"
          >
            <text class="ep-text">{{ ep.name }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 线路面板 -->
    <view class="route-panel" v-if="routePanelVisible" @click.stop>
      <view class="panel-mask" @click="hideAllPanels" :focusable="true"></view>
      <view class="panel-content">
        <text class="panel-title">选择线路</text>
        <view class="route-list">
          <view
            v-for="(route, i) in routeList"
            :key="i"
            :class="['route-item', activeRoute === i ? 'active' : '']"
            @click="switchToRoute(i)"
            :focusable="true"
          >
            <text class="route-text">{{ route }}</text>
            <text class="route-status" v-if="activeRoute === i">● 当前</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 倍速面板 -->
    <view class="speed-panel" v-if="speedPanelVisible" @click.stop>
      <view class="panel-mask" @click="hideAllPanels" :focusable="true"></view>
      <view class="panel-content">
        <text class="panel-title">倍速播放</text>
        <view class="speed-list">
          <view
            v-for="s in speedOptions"
            :key="s.value"
            :class="['speed-item', currentSpeed === s.value ? 'active' : '']"
            @click="setSpeed(s.value)"
            :focusable="true"
          >
            <text class="speed-text">{{ s.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- P2-5: 音量面板 -->
    <view class="volume-panel" v-if="volumeVisible" @click.stop>
      <view class="panel-mask" @click="hideVolume" :focusable="true"></view>
      <view class="volume-content">
        <text class="volume-icon">🔊</text>
        <view class="volume-slider" @click="setVolumeByClick" :focusable="true">
          <view class="volume-track">
            <view class="volume-fill" :style="{ width: currentVolume + '%' }"></view>
            <view class="volume-dot" :style="{ left: currentVolume + '%' }"></view>
          </view>
        </view>
        <text class="volume-val">{{ currentVolume }}</text>
        <view class="volume-btns">
          <view class="vol-btn" @click="adjustVolume(-10)" :focusable="true"><text>-</text></view>
          <view class="vol-btn" @click="adjustVolume(10)" :focusable="true"><text>+</text></view>
        </view>
      </view>
    </view>

    <!-- 续播提示 -->
    <view class="resume-dialog" v-if="resumeDialogVisible" @click.stop>
      <view class="dialog-content">
        <text class="dialog-title">继续播放</text>
        <text class="dialog-text">上次播放到 {{ formatTime(resumeTime) }}</text>
        <view class="dialog-btns">
          <view class="dialog-btn" @click="resumePlay" :focusable="true">
            <text>继续播放</text>
          </view>
          <view class="dialog-btn secondary" @click="playFromStart" :focusable="true">
            <text>从头播放</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 自动下一集倒计时 -->
    <view class="next-episode-dialog" v-if="nextEpisodeCountdown > 0" @click.stop>
      <view class="dialog-content">
        <text class="dialog-text">{{ nextEpisodeCountdown }}秒后播放下一集</text>
        <view class="dialog-btns">
          <view class="dialog-btn secondary" @click="cancelNextEpisode" :focusable="true">
            <text>取消</text>
          </view>
          <view class="dialog-btn" @click="doNextEpisode" :focusable="true">
            <text>立即播放</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getVodDetail } from "@/api/vod"
import { fixPicUrl } from "@/api/config"
import { autoFocus } from "@/utils/focus"
import { formatTime } from "@/utils/format"
import { store } from "@/store"

// 方向键 keyCode
const KEY_DPAD_UP = 19
const KEY_DPAD_DOWN = 20
const KEY_DPAD_LEFT = 21
const KEY_DPAD_RIGHT = 22
const KEY_DPAD_CENTER = 23
const KEY_VOLUME_UP = 24
const KEY_VOLUME_DOWN = 25

export default {
  data() {
    return {
      // P2-6: 弹窗焦点锁定
      focusLocked: false,
      vodId: 0,
      title: "",
      vodPic: "",
      playUrl: "",
      routeList: [],
      routeUrls: [],
      activeRoute: 0,
      episodeList: [],
      currentEp: 0,
      historyEp: -1,
      playing: false,
      buffering: true,
      errorMsg: "",
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
        { label: "0.5x", value: 0.5 },
        { label: "0.75x", value: 0.75 },
        { label: "1.0x", value: 1.0 },
        { label: "1.25x", value: 1.25 },
        { label: "1.5x", value: 1.5 },
        { label: "2.0x", value: 2.0 }
      ],
      resumeDialogVisible: false,
      resumeTime: 0,
      nextEpisodeCountdown: 0,
      countdownTimer: null,
      videoContext: null,
      // 快进快退提示
      seekHintVisible: false,
      seekDirection: '',
      seekDelta: 0,
      seekHintTimer: null,
      // 进度保存节流
      lastSaveTime: 0,
      // P2-5: 音量控制
      volumeVisible: false,
      currentVolume: 80,
      // P3: 方向键拦截器引用
      _keyHandler: null,
      // 待执行的 seek（-1 表示无），用于续播/切集/切线路后精确定位
      _pendingSeek: -1,
      // 已失败的线路集合，避免自动切换时重复尝试
      _failedRoutes: null,
      // P5: 字幕开关
      subtitleEnabled: false,
    }
  },
  computed: {
    episodeName() {
      const ep = this.episodeList[this.currentEp]
      return ep ? ep.name : ""
    },
    progressPercent() {
      return this.duration > 0 ? (this.currentTime / this.duration * 100) : 0
    },
    speedLabel() {
      const opt = this.speedOptions.find(s => s.value === this.currentSpeed)
      return opt ? opt.label : "1.0x"
    }
  },
  onLoad(options) {
    if (options.id) this.vodId = Number(options.id)
    if (options.url) this.playUrl = decodeURIComponent(options.url)
    if (options.title) this.title = decodeURIComponent(options.title)
    if (options.ep !== undefined) this.currentEp = Number(options.ep)
    if (options.route !== undefined) this.activeRoute = Number(options.route)

    if (this.vodId) this.loadDetail()
    this.videoContext = uni.createVideoContext("videoPlayer", this)
    this.showControlBar()
    this.checkResume()
    this.setupKeyHandler()
    // P5: 加载字幕设置
    this.loadSubtitleSetting()
  },
  onUnload() {
    this.saveProgress()
    this.clearTimers()
    this.teardownKeyHandler()
  },
  onHide() {
    this.saveProgress()
  },
  onReady() {
    this.$nextTick(() => autoFocus(this.$el))
  },
  // P2: 电视返回键拦截 - 弹窗打开时先关闭弹窗
  onBackPress(e) {
    if (this.episodePanelVisible || this.routePanelVisible || this.speedPanelVisible || this.volumeVisible) {
      this.hideAllPanels()
      this.hideVolume()
      return true // 消费返回事件
    }
    if (this.resumeDialogVisible) {
      this.resumeDialogVisible = false
      return true
    }
    if (this.nextEpisodeCountdown > 0) {
      this.cancelNextEpisode()
      return true
    }
    // 未消费则触发默认返回
  },
  methods: {
    async loadDetail() {
      try {
        const res = await getVodDetail(this.vodId)
        if (res.list && res.list.length > 0) {
          const detail = res.list[0]
          this.title = detail.vod_name || this.title
          this.vodPic = this.fixPicUrl(detail.vod_pic || "")
          this.parseEpisodes(detail.vod_play_from, detail.vod_play_url)
        }
      } catch (e) {
        console.error("loadDetail fail", e)
      }
    },
    parseEpisodes(playFrom, playUrl) {
      if (!playUrl) return
      const routes = (playFrom || "").split("$$$").filter(r => r)
      const urlRoutes = playUrl.split("$$$")
      this.routeList = routes.length > 0 ? routes : ["默认线路"]
      this.routeUrls = urlRoutes
      this.updateEpisodes()
    },
    updateEpisodes() {
      const routeUrl = this.routeUrls[this.activeRoute] || ""
      const episodes = routeUrl.split("#").filter(e => e)
      this.episodeList = episodes.map((ep, i) => {
        const [name, url] = ep.split("$")
        return { name: name || `第${i + 1}集`, url: url || ep }
      })
      if (this.episodeList[this.currentEp]) {
        this.playUrl = this.episodeList[this.currentEp].url
      }
    },
    checkResume() {
      const history = this.getPlayHistory()
      if (history && history.progress > 0) {
        this.resumeTime = history.progress
        this.historyEp = history.episode
        // P3: 恢复上次播放的线路
        if (history.activeRoute !== undefined && history.activeRoute < this.routeList.length) {
          this.activeRoute = history.activeRoute
        }
        this.resumeDialogVisible = true
      }
    },
    getPlayHistory() {
      return store.getHistory(this.vodId)
    },
    resumePlay() {
      this.resumeDialogVisible = false
      // 等视频开始播放后再 seek，确保定位准确
      this._pendingSeek = this.resumeTime > 0 ? this.resumeTime : 0
    },
    playFromStart() {
      this.resumeDialogVisible = false
    },
    // 点击屏幕显示/隐藏控制栏
    onScreenClick() {
      if (this.episodePanelVisible || this.routePanelVisible || this.speedPanelVisible) return
      if (this.resumeDialogVisible || this.nextEpisodeCountdown > 0) return
      this.controlVisible = !this.controlVisible
      if (this.controlVisible) this.showControlBar()
    },
    onTimeUpdate(e) {
      this.currentTime = e.detail.currentTime
      this.duration = e.detail.duration
      // 每10秒保存一次进度
      if (Date.now() - this.lastSaveTime > 10000) {
        this.saveProgress()
        this.lastSaveTime = Date.now()
      }
    },
    onEnded() {
      // 播完自动下一集
      if (this.currentEp < this.episodeList.length - 1) {
        this.startNextEpisodeCountdown()
      }
    },
    startNextEpisodeCountdown() {
      this.nextEpisodeCountdown = 5
      this.controlVisible = true
      if (this.countdownTimer) clearInterval(this.countdownTimer)
      this.countdownTimer = setInterval(() => {
        this.nextEpisodeCountdown--
        if (this.nextEpisodeCountdown <= 0) {
          clearInterval(this.countdownTimer)
          this.doNextEpisode()
        }
      }, 1000)
    },
    cancelNextEpisode() {
      this.nextEpisodeCountdown = 0
      if (this.countdownTimer) clearInterval(this.countdownTimer)
    },
    doNextEpisode() {
      this.nextEpisodeCountdown = 0
      if (this.countdownTimer) clearInterval(this.countdownTimer)
      this.nextEpisode()
    },
    onError(e) {
      if (!this._failedRoutes) this._failedRoutes = new Set()
      this._failedRoutes.add(this.activeRoute)
      // 所有线路都已尝试过 → 报错
      if (this._failedRoutes.size >= this.routeList.length) {
        this.errorMsg = "播放失败，所有线路均已尝试"
        this.buffering = false
        return
      }
      this.autoSwitchRoute()
    },
    autoSwitchRoute() {
      if (this.routeList.length <= 1) {
        this.errorMsg = "播放失败，仅有一条线路"
        this.buffering = false
        return
      }
      if (!this._failedRoutes) this._failedRoutes = new Set()
      // 选一条未失败的线路（跳过已尝试的）
      for (let i = 0; i < this.routeList.length; i++) {
        const r = (this.activeRoute + i + 1) % this.routeList.length
        if (!this._failedRoutes.has(r)) {
          this.switchToRoute(r)
          return
        }
      }
      this.errorMsg = "播放失败，所有线路均已尝试"
      this.buffering = false
    },
    onWaiting() { this.buffering = true },
    onPlaying() {
      this.buffering = false
      this.errorMsg = ""
      this.playing = true
      this._failedRoutes = null
      // 处理待执行的 seek（续播/切集/切线路后定位）
      if (this._pendingSeek >= 0) {
        const t = this._pendingSeek
        this._pendingSeek = -1
        this.$nextTick(() => { if (this.videoContext) this.videoContext.seek(t) })
      }
    },
    onPlay() { this.playing = true },
    onPause() { this.playing = false },
    seekForward() {
      const delta = 10
      const target = Math.min(this.currentTime + delta, this.duration)
      this.videoContext.seek(target)
      this.showSeekHint('forward', delta)
      this.showControlBar()
    },
    seekBackward() {
      const delta = 10
      const target = Math.max(this.currentTime - delta, 0)
      this.videoContext.seek(target)
      this.showSeekHint('backward', delta)
      this.showControlBar()
    },
    showSeekHint(direction, delta) {
      this.seekDirection = direction
      this.seekDelta = delta
      this.seekHintVisible = true
      if (this.seekHintTimer) clearTimeout(this.seekHintTimer)
      this.seekHintTimer = setTimeout(() => { this.seekHintVisible = false }, 1000)
    },
    togglePlay() {
      if (this.playing) {
        this.videoContext.pause()
      } else {
        this.videoContext.play()
      }
      this.playing = !this.playing
      this.showControlBar()
      // 暂停后自动聚焦播放按钮，用户按OK即可继续
      if (!this.playing) {
        this.$nextTick(() => {
          const playBtn = this.$el && this.$el.querySelector('.play-btn')
          if (playBtn) playBtn.focus()
        })
      }
    },
    seekTo(e) {
      // TV: 遥控器OK键没有鼠标坐标，默认跳转5秒；模拟器/触摸设备仍支持点击定位
      let time
      if (e && (e.clientX || e.pageX)) {
        // 有鼠标坐标：精确点击定位
        const rect = e.currentTarget ? e.currentTarget.getBoundingClientRect() : null
        if (rect) {
          const x = (e.clientX || e.pageX) - rect.left
          const percent = Math.max(0, Math.min(1, x / rect.width))
          time = this.duration * percent
        }
      }
      if (!time) {
        // TV 遥控器：OK键跳转5秒
        time = Math.min(this.currentTime + 5, this.duration)
      }
      this.videoContext.seek(time)
      this.showControlBar()
    },
    prevEpisode() {
      if (this.currentEp > 0) {
        this.playEpisode(this.currentEp - 1)
      } else {
        uni.showToast({ title: "已是第一集", icon: "none" })
      }
    },
    nextEpisode() {
      if (this.currentEp < this.episodeList.length - 1) {
        this.playEpisode(this.currentEp + 1)
      } else {
        uni.showToast({ title: "已是最后一集", icon: "none" })
      }
    },
    playEpisode(index) {
      if (index < 0 || index >= this.episodeList.length) return
      // 先保存旧剧集进度，再切换（避免旧进度覆盖到新剧集）
      if (this.currentEp !== index) {
        this.saveProgress()
      }
      this.currentEp = index
      this.playUrl = this.episodeList[index].url
      this.errorMsg = ""
      this.buffering = true
      this.episodePanelVisible = false
      this._failedRoutes = null
      // 确保视频重新加载并播放
      this.$nextTick(() => { if (this.videoContext) this.videoContext.play() })
    },
    showEpisodePanel() { this.hideAllPanels(); this.episodePanelVisible = true; this.focusLocked = true },
    showRoutePanel() { this.hideAllPanels(); this.routePanelVisible = true; this.focusLocked = true },
    showSpeedPanel() { this.hideAllPanels(); this.speedPanelVisible = true; this.focusLocked = true },
    hideAllPanels() {
      this.episodePanelVisible = false
      this.routePanelVisible = false
      this.speedPanelVisible = false
      this.focusLocked = false
      // 恢复焦点到控制栏播放按钮，避免焦点丢失
      this.$nextTick(() => {
        const playBtn = this.$el && this.$el.querySelector('.play-btn')
        if (playBtn) playBtn.focus()
      })
    },
    switchToRoute(index) {
      if (this.activeRoute === index) return
      this.activeRoute = index
      this.updateEpisodes()
      this.routePanelVisible = false
      this.errorMsg = ""
      this.buffering = true
      // 不在此清空 _failedRoutes —— 只在 onPlaying（播放成功）时清空
      // 避免自动切换线路时重复尝试已失败的线路
      // 保存线路偏好
      this.saveProgress()
      // 确保视频重新加载播放
      this.$nextTick(() => { if (this.videoContext) this.videoContext.play() })
    },
    setSpeed(speed) {
      this.currentSpeed = speed
      this.videoContext.playbackRate(speed)
      this.speedPanelVisible = false
    },
    retryPlay() {
      this.errorMsg = ""
      this.buffering = true
      this._failedRoutes = null
      this.videoContext.play()
    },
    showControlBar() {
      this.controlVisible = true
      if (this.controlTimer) clearTimeout(this.controlTimer)
      this.controlTimer = setTimeout(() => {
        if (this.playing && !this.episodePanelVisible && !this.routePanelVisible && !this.speedPanelVisible && !this.volumeVisible) {
          this.controlVisible = false
        }
      }, 6000)
    },
    saveProgress() {
      if (this.currentTime <= 0) return
      store.addHistory({
        vod_id: this.vodId,
        vod_name: this.title,
        vod_pic: this.vodPic,
        episode: this.currentEp,
        progress: this.currentTime,
        duration: this.duration,
        activeRoute: this.activeRoute,
        time: Date.now()
      })
    },
    formatTime,
    clearTimers() {
      if (this.controlTimer) clearTimeout(this.controlTimer)
      if (this.countdownTimer) clearInterval(this.countdownTimer)
      if (this.seekHintTimer) clearTimeout(this.seekHintTimer)
    },
    fixPicUrl,
    toggleVolume() {
      this.volumeVisible = !this.volumeVisible
      this.focusLocked = this.volumeVisible
    },
    hideVolume() {
      this.volumeVisible = false
      this.focusLocked = false
    },
    adjustVolume(delta) {
      this.currentVolume = Math.max(0, Math.min(100, this.currentVolume + delta))
      this.applyVolume()
    },
    setVolumeByClick(e) {
      // TV: 遥控器OK键默认音量+5；有鼠标坐标时精确定位
      if (e && (e.clientX || e.pageX)) {
        const rect = e.currentTarget && e.currentTarget.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null
        if (rect) {
          const x = (e.clientX || e.pageX) - rect.left
          this.currentVolume = Math.max(0, Math.min(100, Math.round(x / rect.width * 100)))
        }
      } else {
        // TV 遥控器：每次加5
        this.currentVolume = Math.min(100, this.currentVolume + 5)
      }
      this.applyVolume()
    },
    applyVolume() {
      try {
        if (this.videoContext) {
          if (this.videoContext.setVolume) {
            this.videoContext.setVolume(this.currentVolume / 100)
          } else if (this.videoContext.$video) {
            this.videoContext.$video.volume = this.currentVolume / 100
          }
        }
      } catch (e) {}
    },
    goBack() {
      this.saveProgress()
      uni.navigateBack()
    },
    // P5: 字幕开关
    loadSubtitleSetting() {
      this.subtitleEnabled = store.getSubtitle()
    },
    toggleSubtitle() {
      this.subtitleEnabled = !this.subtitleEnabled
      store.setSubtitle(this.subtitleEnabled)
      uni.showToast({ title: this.subtitleEnabled ? "字幕已开启" : "字幕已关闭", icon: "none", duration: 1200 })
    },
    // P3: 方向键快捷操作 - 注册按键监听
    setupKeyHandler() {
      // #ifdef APP-PLUS
      try {
        if (plus && plus.key) {
          this._keyHandler = (e) => {
            this.handleDpadKey(e.keyCode)
          }
          plus.key.addEventListener('keydown', this._keyHandler)
          console.log('[Player] 方向键快捷操作已启用')
        }
      } catch (e) {
        console.log('[Player] 方向键拦截不可用:', e)
      }
      // #endif
    },
    // P3: 方向键快捷操作 - 取消按键监听
    teardownKeyHandler() {
      // #ifdef APP-PLUS
      try {
        if (plus && plus.key && this._keyHandler) {
          plus.key.removeEventListener('keydown', this._keyHandler)
        }
      } catch (e) {}
      // #endif
    },
    // P3: 方向键快捷操作 - 处理遥控器按键
    handleDpadKey(keyCode) {
      // 有弹窗打开时不拦截，让焦点系统正常工作
      if (this.resumeDialogVisible || this.nextEpisodeCountdown > 0) return
      if (this.episodePanelVisible || this.routePanelVisible || this.speedPanelVisible || this.volumeVisible) return

      // 控制栏可见时：不拦截方向键/OK，让焦点系统导航按钮
      if (this.controlVisible) return

      switch (keyCode) {
        case KEY_DPAD_UP:
          // 方向上键 → 音量 +5
          this.adjustVolume(5)
          this.showVolumeHint()
          break
        case KEY_VOLUME_UP:
          // 物理音量+键 → 音量 +5
          this.adjustVolume(5)
          this.showVolumeHint()
          break
        case KEY_DPAD_DOWN:
          // 方向下键 → 呼出控制栏
          this.showControlBar()
          break
        case KEY_VOLUME_DOWN:
          // 物理音量-键 → 音量 -5（而非呼出控制栏）
          this.adjustVolume(-5)
          this.showVolumeHint()
          break
        case KEY_DPAD_LEFT:
          // 左键 → 快退10秒 + 呼出控制栏
          this.seekBackward()
          this.showControlBar()
          break
        case KEY_DPAD_RIGHT:
          // 右键 → 快进10秒 + 呼出控制栏
          this.seekForward()
          this.showControlBar()
          break
        case KEY_DPAD_CENTER:
          // OK键 → 暂停/播放 + 呼出控制栏
          this.togglePlay()
          this.showControlBar()
          break
      }
    },
    // P3: 音量调节提示
    showVolumeHint() {
      this.seekDirection = 'volume'
      this.seekDelta = this.currentVolume
      this.seekHintVisible = true
      if (this.seekHintTimer) clearTimeout(this.seekHintTimer)
      this.seekHintTimer = setTimeout(() => { this.seekHintVisible = false }, 1500)
    },
  }
}
</script>

<style scoped>
.page { background: #000; width: 100vw; height: 100vh; overflow: hidden; }
.player-container { width: 100%; height: 100%; position: relative; }
.player-video { width: 100%; height: 100%; }

/* 遮罩 */
.buffer-mask, .error-mask {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  background: rgba(0,0,0,0.7); z-index: 100;
}
.loading-spinner {
  width: 60rpx; height: 60rpx; border: 4rpx solid rgba(0,212,255,0.3);
  border-top-color: #00d4ff; border-radius: 50%;
  animation: spin 1s linear infinite; margin-bottom: 30rpx;
}
@keyframes spin { to { transform: rotate(360deg); } }
.buffer-text, .error-text { font-size: 32rpx; color: #fff; margin-bottom: 30rpx; }
.error-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.error-btns { display: flex; gap: 30rpx; }
.retry-btn, .switch-btn {
  padding: 20rpx 50rpx; background: rgba(0,212,255,0.3);
  border-radius: 12rpx; border: 2rpx solid #00d4ff;
}
.retry-btn text, .switch-btn text { font-size: 28rpx; color: #00d4ff; }

/* 快进快退提示 */
.seek-hint {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  background: rgba(0,0,0,0.7); padding: 20rpx 40rpx; border-radius: 16rpx;
}
.seek-hint-text { font-size: 36rpx; color: #fff; }

/* 控制栏 */
.control-bar {
  position: absolute; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 100%);
  padding: 80rpx 60rpx 60rpx;
  transition: transform 0.3s ease; z-index: 50;
}
.control-bar.hide { transform: translateY(100%); }
.control-bar.show { transform: translateY(0); }
.control-top { display: flex; align-items: center; margin-bottom: 30rpx; }
.back-btn {
  padding: 16rpx 24rpx; background: rgba(255,255,255,0.2);
  border-radius: 12rpx; margin-right: 30rpx; transition: all 0.2s ease;
}
.back-btn:focus { background: rgba(0,212,255,0.3); transform: scale(1.1); }
.back-icon { font-size: 48rpx; color: #fff; }
.video-title { font-size: 36rpx; color: #fff; font-weight: bold; }
.episode-name { font-size: 32rpx; color: #00d4ff; margin-left: 20rpx; }
.control-bottom { margin-top: 20rpx; }
.progress-section { display: flex; align-items: center; gap: 20rpx; margin-bottom: 24rpx; }
.time-text { font-size: 24rpx; color: #aaa; min-width: 80rpx; }
.progress-bar {
  flex: 1; height: 8rpx; background: rgba(255,255,255,0.3);
  border-radius: 4rpx; position: relative; cursor: pointer;
}
.progress-buffered {
  position: absolute; top: 0; left: 0; height: 100%;
  background: rgba(255,255,255,0.2); border-radius: 4rpx;
}
.progress-fill {
  height: 100%; background: linear-gradient(90deg, #00d4ff, #00ff88);
  border-radius: 4rpx; transition: width 0.1s linear;
}
.progress-dot {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 20rpx; height: 20rpx; background: #00d4ff; border-radius: 50%;
  box-shadow: 0 0 10rpx rgba(0,212,255,0.8);
}
.control-btns { display: flex; justify-content: center; gap: 40rpx; }
.ctrl-btn {
  display: flex; flex-direction: column; align-items: center;
  padding: 16rpx 32rpx; border-radius: 12rpx; transition: all 0.2s ease;
}
.ctrl-btn:focus { background: rgba(0,212,255,0.2); transform: scale(1.1); }
.ctrl-btn.active { background: rgba(0,255,136,0.15); }
.ctrl-btn.disabled { opacity: 0.3; }
.ctrl-btn.disabled:focus { transform: none; background: transparent; }
.ctrl-icon { font-size: 40rpx; color: #fff; }
.ctrl-label { font-size: 28rpx; color: #aaa; margin-top: 8rpx; }
.play-btn .ctrl-icon { font-size: 56rpx; }

/* 面板 */
.episode-panel, .route-panel, .speed-panel {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 200;
}
.panel-mask { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); }
.panel-content {
  position: absolute; right: 100rpx; top: 50%; transform: translateY(-50%);
  width: 600rpx; max-height: 70vh; background: rgba(20,30,50,0.95);
  border-radius: 24rpx; padding: 40rpx; border: 2rpx solid rgba(0,212,255,0.3);
}
.panel-title { display: block; font-size: 36rpx; color: #fff; font-weight: bold; margin-bottom: 30rpx; text-align: center; }
.episode-grid { max-height: 50vh; }
.ep-item {
  display: inline-block; width: 140rpx; padding: 20rpx 0; margin: 10rpx;
  text-align: center; background: rgba(255,255,255,0.1); border-radius: 12rpx;
  border: 2rpx solid transparent; transition: all 0.2s ease;
}
.ep-item:focus, .ep-item.active { background: rgba(0,212,255,0.2); border-color: #00d4ff; transform: scale(1.05); }
.ep-text { font-size: 30rpx; color: #ccc; }
.ep-item.active .ep-text { color: #00d4ff; font-weight: bold; }
.ep-item.history { border-color: rgba(255,180,0,0.5); }

.route-list, .speed-list { display: flex; flex-direction: column; gap: 16rpx; }
.route-item, .speed-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24rpx; background: rgba(255,255,255,0.1); border-radius: 12rpx;
  border: 2rpx solid transparent; transition: all 0.2s ease;
}
.route-item:focus, .speed-item:focus, .route-item.active, .speed-item.active {
  background: rgba(0,212,255,0.2); border-color: #00d4ff;
}
.route-text, .speed-text { font-size: 28rpx; color: #ccc; }
.route-item.active .route-text, .speed-item.active .speed-text { color: #00d4ff; }
.route-status { font-size: 28rpx; color: #00d4ff; }

/* 对话框 */
.resume-dialog, .next-episode-dialog {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  display: flex; justify-content: center; align-items: center;
  background: rgba(0,0,0,0.8); z-index: 300;
}
.dialog-content {
  background: rgba(20,30,50,0.95); padding: 60rpx; border-radius: 24rpx;
  border: 2rpx solid rgba(0,212,255,0.3); text-align: center;
}
.dialog-title { display: block; font-size: 40rpx; color: #fff; font-weight: bold; margin-bottom: 20rpx; }
.dialog-text { display: block; font-size: 28rpx; color: #aaa; margin-bottom: 40rpx; }
.dialog-btns { display: flex; gap: 30rpx; justify-content: center; }
.dialog-btn { padding: 20rpx 50rpx; background: linear-gradient(135deg, #00d4ff, #00a8ff); border-radius: 12rpx; }
.dialog-btn text { font-size: 28rpx; color: #fff; }
.dialog-btn.secondary { background: rgba(255,255,255,0.1); border: 2rpx solid rgba(255,255,255,0.3); }
.dialog-btn.secondary text { color: #fff; }
.next-episode-dialog .dialog-content { padding: 40rpx 80rpx; }
.next-episode-dialog .dialog-text { font-size: 32rpx; color: #fff; margin-bottom: 30rpx; }

/* P2-5: 音量面板 */
.volume-panel {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 200;
}
.volume-content {
  position: absolute; right: 100rpx; top: 50%; transform: translateY(-50%);
  width: 500rpx; background: rgba(20,30,50,0.95);
  border-radius: 24rpx; padding: 40rpx; border: 2rpx solid rgba(0,212,255,0.3);
  text-align: center;
}
.volume-icon { font-size: 48rpx; display: block; margin-bottom: 30rpx; }
.volume-slider { padding: 20rpx 0; }
.volume-track {
  width: 100%; height: 12rpx; background: rgba(255,255,255,0.2); border-radius: 6rpx;
  position: relative;
}
.volume-fill { height: 100%; background: #00d4ff; border-radius: 6rpx; transition: width 0.15s; }
.volume-dot {
  position: absolute; top: 50%; transform: translate(-50%,-50%);
  width: 28rpx; height: 28rpx; background: #00d4ff; border-radius: 50%;
  box-shadow: 0 0 10rpx rgba(0,212,255,0.8);
}
.volume-val { font-size: 48rpx; color: #00d4ff; font-weight: bold; display: block; margin: 20rpx 0; }
.volume-btns { display: flex; justify-content: center; gap: 60rpx; }
.vol-btn {
  width: 80rpx; height: 80rpx; display: flex; justify-content: center; align-items: center;
  background: rgba(0,212,255,0.2); border-radius: 50%; border: 2rpx solid rgba(0,212,255,0.4);
  font-size: 40rpx; color: #00d4ff; transition: all 0.2s;
}
.vol-btn:focus { background: rgba(0,212,255,0.4); transform: scale(1.1); }
</style>
