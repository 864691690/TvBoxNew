<template>
  <view class="back-btn" @click="goBack" :focusable="true">
    <text class="back-icon">‹</text>
    <text class="back-text">返回</text>
  </view>
</template>

<script>
export default {
  methods: {
    goBack() { uni.navigateBack() }
  }
}
</script>

<style scoped>
.back-btn {
  display: flex; align-items: center; padding: 16rpx 24rpx;
  background: rgba(0,212,255,0.15); border-radius: 12rpx;
  border: 2rpx solid rgba(0,212,255,0.3);
  transition: all 0.2s ease;
}
.back-btn:focus { transform: scale(1.08); background: rgba(0,212,255,0.3); box-shadow: 0 0 20rpx rgba(0,212,255,0.5); }
.back-icon { font-size: 48rpx; color: #00d4ff; margin-right: 12rpx; }
.back-text { font-size: 28rpx; color: #00d4ff; }
</style>
