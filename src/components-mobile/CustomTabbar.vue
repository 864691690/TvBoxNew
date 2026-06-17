<template>
  <view class="tabbar">
    <view
      v-for="(tab, i) in tabs"
      :key="i"
      :class="['tab-item', current === i ? 'active' : '']"
      @click="switchTab(i)"
    >
      <text class="tab-icon">{{ tab.icon }}</text>
      <text class="tab-text">{{ tab.text }}</text>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    current: { type: Number, default: 0 }
  },
  data() {
    return {
      tabs: [
        { text: '首页', icon: '\u2302', page: '/pages-mobile/home/index' },
        { text: '短剧', icon: '\u25B6', page: '/pages-mobile/category/index?cat=20' },
        { text: '发现', icon: '\u2315', page: '/pages-mobile/search/index' },
        { text: '我的', icon: '\u263A', page: '/pages-mobile/mine/index' }
      ]
    }
  },
  methods: {
    switchTab(i) {
      if (i === this.current) return
      uni.switchTab({ url: this.tabs[i].page })
    }
  }
}
</script>

<style scoped>
.tabbar {
  position: fixed; bottom: 0; left: 0; right: 0; height: 100rpx;
  background: #fff; border-top: 1rpx solid #EEEEEE;
  display: flex; align-items: center; justify-content: space-around;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 999;
}
.tab-item {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  flex: 1; height: 100%;
}
.tab-icon { font-size: 36rpx; color: #999999; line-height: 1; margin-bottom: 4rpx; }
.tab-text { font-size: 22rpx; color: #999999; }
.tab-item.active .tab-icon,
.tab-item.active .tab-text { color: #E53935; }
.tab-item.active .tab-text { font-weight: bold; }
</style>
