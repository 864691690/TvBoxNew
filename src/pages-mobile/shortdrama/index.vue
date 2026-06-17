<template>
  <view class="page">
    <!-- 顶部标签栏 -->
    <view class="top-bar">
      <text class="title">短剧</text>
      <text class="auto-play" :class="{ on: autoPlay }" @click="toggleAutoPlay">
        <view class="ap-icon" v-html="autoPlay ? playIcon : pauseIcon"></view>
        <text class="ap-text">自动连播</text>
      </text>
    </view>

    <!-- 上下滑动的短剧列表 -->
    <scroll-view
      scroll-y
      class="drama-scroll"
      :scroll-into-view="currentId"
      :scroll-with-animation="true"
      @scrolltolower="loadMore"
      upper-threshold="50"
      lower-threshold="50"
    >
      <view class="drama-loading" v-if="loading && !list.length">
        <text>加载中...</text>
      </view>

      <view
        v-for="(item, i) in list"
        :key="item.vod_id"
        :id="'drama-' + i"
        :class="['drama-item', currentIndex === i ? 'active' : '']"
        @click="playDrama(item, i)"
      >
        <image
          class="drama-bg"
          :src="item.vod_pic || defaultPic"
          mode="aspectFill"
          lazy-load
        />
        <view class="drama-mask"></view>

        <!-- 中央播放图标 -->
        <view class="drama-play-center" v-if="currentIndex !== i">
          <view class="play-icon" v-html="playIcon"></view>
        </view>

        <!-- 短剧信息 -->
        <view class="drama-info">
          <view class="drama-name">{{ item.vod_name }}</view>
          <view class="drama-remarks" v-if="item.vod_remarks">{{ item.vod_remarks }}</view>
          <view class="drama-class" v-if="item.vod_class">类型: {{ item.vod_class }}</view>
        </view>

        <!-- 侧边操作栏 -->
        <view class="drama-side">
          <view class="side-icon" @click.stop="toggleLike(item)">
            <view class="icon" :class="{ liked: likeMap[item.vod_id] }" v-html="likeMap[item.vod_id] ? heartFilledIcon : heartOutlineIcon"></view>
            <text class="num">{{ likeMap[item.vod_id] || '点赞' }}</text>
          </view>
          <view class="side-icon">
            <view class="icon" v-html="messageIcon"></view>
            <text class="num">评论</text>
          </view>
          <view class="side-icon" @click.stop="shareDrama(item)">
            <view class="icon" v-html="shareIcon"></view>
            <text class="num">分享</text>
          </view>
        </view>

        <!-- 进度条 + 剧集数 -->
        <view class="drama-bottom">
          <view class="ep-progress-row">
            <text class="ep-current">第 {{ currentIndex === i ? currentEp + 1 : 1 }} 集</text>
            <text class="ep-total" v-if="item.totalEp">/ 共 {{ item.totalEp }} 集</text>
          </view>
          <view class="ep-progress-bar" v-if="currentIndex === i && currentDramaProgress > 0">
            <view class="ep-progress-fill" :style="{ width: currentDramaProgress + '%' }"></view>
          </view>
        </view>

        <view class="drama-play-hint" v-if="currentIndex === i">
          <text>点击全屏播放 · 上下滑动切换</text>
        </view>
      </view>

      <view class="drama-loading" v-if="loading && list.length">
        <text>加载更多...</text>
      </view>
      <view class="drama-end" v-if="!hasMore && list.length">
        <text>- 已经到底了 -</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { DEFAULT_PIC, fixPicUrl } from "@/api/config"
import { getFilteredVodList } from "@/api/vod"

export default {
  data() {
    return {
      playIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
      pauseIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`,
      heartFilledIcon: `<svg class="icon heart-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#e74c3c" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
      heartOutlineIcon: `<svg class="icon heart-icon-outline" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
      messageIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`,
      shareIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
      list: [],
      page: 1,
      hasMore: true,
      loading: true,
      currentIndex: 0,            // 当前短剧索引
      currentEp: 0,                // 当前短剧的当前集数
      autoPlay: true,              // 自动连播开关
      playProgress: {},            // 各短剧的播放进度 { vod_id: { ep: 0, percent: 0 } }
      _progressTimer: null,        // 模拟进度定时器
      likeMap: {},
      defaultPic: DEFAULT_PIC,
    }
  },
  computed: {
    currentId() {
      return this.list.length > 0 ? `drama-${this.currentIndex}` : ''
    },
    currentDramaProgress() {
      const id = this.list[this.currentIndex]?.vod_id
      if (!id) return 0
      return this.playProgress[id]?.percent || 0
    }
  },
  onShow() {
    if (!this._initialized) this.init()
    this._initialized = true
  },
  onLoad() {
    this.init()
  },
  onUnload() {
    this.stopProgressTimer()
  },
  watch: {
    currentIndex() {
      // 切换短剧时重置当前集数
      this.currentEp = 0
      this.startProgressTimer()
    }
  },
  methods: {
    async init() {
      this._initialized = true
      this.page = 1
      this.list = []
      this.hasMore = true
      this.currentIndex = 0
      await this.loadList()
      this.startProgressTimer()
    },
    async loadList() {
      if (this.loading && this.list.length) return
      this.loading = true
      try {
        // 短剧 = type_id=20（短剧子分类，33144 条数据）
        const res = await getFilteredVodList(20, undefined, undefined, 'time', undefined, undefined, this.page, 10)
        const items = (res.list || []).map(item => ({
          ...item,
          vod_pic: fixPicUrl(item.vod_pic)
        }))
        if (this.page === 1) this.list = items
        else {
          const existIds = new Set(this.list.map(x => x.vod_id))
          items.forEach(it => { if (!existIds.has(it.vod_id)) this.list.push(it) })
        }
        this.hasMore = items.length >= 10
      } catch (e) { console.error(e) }
      this.loading = false
    },
    loadMore() {
      if (!this.loading && this.hasMore) {
        this.page++
        this.loadList()
      }
    },
    playDrama(item, i) {
      this.currentIndex = i
      this.currentEp = 0
      // 跳到播放页（横屏）
      uni.navigateTo({
        url: `/pages-mobile/player/index?id=${item.vod_id}`
      })
    },
    toggleAutoPlay() {
      this.autoPlay = !this.autoPlay
      uni.showToast({ title: this.autoPlay ? '已开启自动连播' : '已关闭自动连播', icon: 'none', duration: 1500 })
    },
    toggleLike(item) {
      const id = item.vod_id
      if (this.likeMap[id]) {
        this.likeMap = { ...this.likeMap, [id]: 0 }
      } else {
        this.likeMap = { ...this.likeMap, [id]: 1 }
        uni.showToast({ title: '已点赞', icon: 'none', duration: 800 })
      }
    },
    shareDrama(item) {
      uni.showToast({ title: '已复制链接', icon: 'none', duration: 1000 })
    },
    // 模拟自动播放进度
    startProgressTimer() {
      this.stopProgressTimer()
      if (!this.autoPlay) return
      const currentDrama = this.list[this.currentIndex]
      if (!currentDrama) return
      this._progressTimer = setInterval(() => {
        const id = currentDrama.vod_id
        const cur = this.playProgress[id] || { ep: 0, percent: 0 }
        let nextPercent = cur.percent + 1
        let nextEp = cur.ep
        // 模拟每 10% 完成一集
        if (nextPercent >= 100) {
          nextPercent = 0
          nextEp += 1
          // 集数大于 10 就自动切下一部短剧
          if (nextEp >= 10) {
            this.playNext()
            return
          }
        }
        this.playProgress = { ...this.playProgress, [id]: { ep: nextEp, percent: nextPercent } }
        this.currentEp = nextEp
      }, 100)  // 100ms 一次，进度增长快一些便于演示
    },
    stopProgressTimer() {
      if (this._progressTimer) {
        clearInterval(this._progressTimer)
        this._progressTimer = null
      }
    },
    playNext() {
      // 自动切到下一个短剧
      if (this.currentIndex < this.list.length - 1) {
        this.currentIndex += 1
        // 滚动到下一个
      } else if (this.hasMore) {
        this.page++
        this.loadList().then(() => {
          if (this.list.length > this.currentIndex + 1) this.currentIndex += 1
        })
      } else {
        uni.showToast({ title: '已经到底了', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page {
  background: #000;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex; justify-content: center; align-items: center;
  padding: 20rpx 32rpx;
  padding-top: calc(30rpx + var(--status-bar-height, 48rpx));
  background: transparent;
  position: absolute; top: 0; left: 0; right: 0;
  z-index: 10;
  flex-shrink: 0;
}
.title {
  font-size: 36rpx; font-weight: bold; color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.5);
}

/* 自动连播开关 - 顶部右上角 */
.auto-play {
  position: absolute; right: 32rpx; top: 50%;
  transform: translateY(-50%);
  padding: 8rpx 20rpx;
  background: rgba(255,255,255,0.15);
  border-radius: 24rpx;
  display: flex; align-items: center; gap: 6rpx;
}
.auto-play.on { background: rgba(76,175,80,0.85); }
.auto-play .ap-icon { font-size: 20rpx; color: #fff; }
.auto-play .ap-text { font-size: 22rpx; color: #fff; }

.drama-scroll {
  flex: 1; min-height: 0;
  background: #000;
}

/* 抖音式：每个短剧占满一屏高度 */
.drama-item {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #000;
  overflow: hidden;
}

.drama-bg {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  filter: blur(8rpx);
  transform: scale(1.1);
}

.drama-mask {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.85) 100%);
}

.drama-play-center {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 4;
  width: 140rpx; height: 140rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 4rpx solid rgba(255,255,255,0.4);
}
.drama-play-center .play-icon {
  font-size: 80rpx; color: #fff;
  margin-left: 10rpx; /* 视觉居中 */
}

.drama-info {
  position: absolute; left: 32rpx; right: 160rpx; bottom: 240rpx;
  z-index: 5;
}
.drama-name {
  display: block;
  font-size: 36rpx; font-weight: bold; color: #fff;
  text-shadow: 0 2rpx 12rpx rgba(0,0,0,0.8);
  margin-bottom: 16rpx;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.drama-remarks, .drama-class {
  display: block;
  font-size: 24rpx; color: rgba(255,255,255,0.85);
  text-shadow: 0 1rpx 4rpx rgba(0,0,0,0.8);
  margin-top: 8rpx;
}

.drama-side {
  position: absolute; right: 24rpx; bottom: 240rpx;
  z-index: 5;
  display: flex; flex-direction: column; gap: 40rpx; align-items: center;
}
.side-icon {
  display: flex; flex-direction: column; align-items: center; gap: 6rpx;
}
.side-icon .icon { font-size: 56rpx; }
.side-icon .num {
  font-size: 22rpx; color: #fff;
  text-shadow: 0 1rpx 4rpx rgba(0,0,0,0.8);
}

/* 底部进度区 */
.drama-bottom {
  position: absolute; left: 32rpx; right: 160rpx; bottom: 160rpx;
  z-index: 5;
}
.ep-progress-row {
  display: flex; align-items: baseline; gap: 8rpx;
  margin-bottom: 10rpx;
}
.ep-current {
  font-size: 26rpx; color: #fff; font-weight: bold;
  text-shadow: 0 1rpx 4rpx rgba(0,0,0,0.8);
}
.ep-total {
  font-size: 22rpx; color: rgba(255,255,255,0.7);
  text-shadow: 0 1rpx 4rpx rgba(0,0,0,0.8);
}
.ep-progress-bar {
  width: 100%; height: 6rpx;
  background: rgba(255,255,255,0.25);
  border-radius: 3rpx;
  overflow: hidden;
}
.ep-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #E53935, #FF7043);
  border-radius: 3rpx;
  transition: width 0.1s linear;
}

.drama-play-hint {
  position: absolute; left: 32rpx; right: 32rpx; bottom: 110rpx;
  z-index: 5;
  text-align: center;
}
.drama-play-hint text {
  display: inline-block;
  padding: 10rpx 24rpx;
  background: rgba(0,0,0,0.5);
  color: rgba(255,255,255,0.85);
  font-size: 22rpx;
  border-radius: 32rpx;
  border: 1rpx solid rgba(255,255,255,0.2);
}

.drama-loading, .drama-end {
  text-align: center; padding: 60rpx 0;
  color: rgba(255,255,255,0.6);
  font-size: 24rpx;
}
</style>
