<template>
  <view class="page">
    <!-- 返回按钮 -->
    <view class="top-bar">
      <BackButton />
      <text class="page-title">关于星途TV</text>
    </view>

    <!-- Logo & 名称 -->
    <view class="hero-section">
      <view class="app-icon">
        <text class="icon-text">📺</text>
      </view>
      <text class="app-name">星途TV</text>
      <text class="app-version">v{{ version }}</text>
    </view>

    <!-- 应用信息 -->
    <view class="info-card">
      <view class="info-row">
        <text class="info-label">应用描述</text>
        <text class="info-value">一款基于 uni-app 开发的电视影视应用，为智能电视和电视盒子打造沉浸式观影体验。</text>
      </view>
      <view class="info-row">
        <text class="info-label">数据源</text>
        <text class="info-value">苹果CMS V10</text>
      </view>
      <view class="info-row">
        <text class="info-label">技术栈</text>
        <text class="info-value">uni-app / Vue 3 / Vite</text>
      </view>
      <view class="info-row">
        <text class="info-label">适用平台</text>
        <text class="info-value">Android TV / 电视盒子</text>
      </view>
    </view>

    <!-- 功能亮点 -->
    <view class="feature-section">
      <text class="section-title">✨ 功能亮点</text>
      <view class="feature-grid">
        <view class="feature-item" v-for="f in features" :key="f.icon">
          <text class="feature-icon">{{ f.icon }}</text>
          <text class="feature-name">{{ f.name }}</text>
          <text class="feature-desc">{{ f.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 版权 -->
    <view class="footer">
      <text class="footer-text">Copyright © 2025 星途TV</text>
      <text class="footer-text">仅供学习交流使用</text>
    </view>
  </view>
</template>

<script>
import { VERSION_NAME } from "@/utils/version"
import BackButton from "@/components/BackButton.vue"

export default {
  components: { BackButton },
  data() {
    return {
      version: VERSION_NAME,
      features: [
        { icon: "🎬", name: "海量资源", desc: "电影/电视剧/综艺/动漫全覆盖" },
        { icon: "🔍", name: "智能搜索", desc: "关键词匹配度排序" },
        { icon: "📺", name: "追剧提醒", desc: "自动检测剧集更新" },
        { icon: "⚡", name: "倍速播放", desc: "0.5x ~ 2.0x 自由切换" },
        { icon: "📡", name: "多线路切换", desc: "播放失败自动换源" },
        { icon: "💾", name: "续播记忆", desc: "自动记录播放进度" },
        { icon: "🎯", name: "TV 遥控优化", desc: "方向键快捷操作" },
        { icon: "🔄", name: "OTA 更新", desc: "自动检测新版本" },
      ]
    }
  },
  methods: {
    goBack() { uni.navigateBack() }
  }
}
</script>

<style scoped>
.page { background: linear-gradient(180deg, #0a1628 0%, #0f1a2a 100%); min-height: 100vh; padding: 60rpx 80rpx; }
.top-bar { display: flex; align-items: center; margin-bottom: 60rpx; }
.back-btn {
  display: flex; align-items: center; padding: 16rpx 24rpx; background: rgba(0,212,255,0.15); border-radius: 12rpx; border: 2rpx solid rgba(0,212,255,0.3); margin-right: 30rpx; transition: all 0.2s ease;
}
.back-btn:focus { transform: scale(1.08); background: rgba(0,212,255,0.3); box-shadow: 0 0 20rpx rgba(0,212,255,0.5); }
.back-icon { font-size: 48rpx; color: #00d4ff; margin-right: 12rpx; }
.back-text { font-size: 28rpx; color: #00d4ff; }
.page-title { font-size: 48rpx; font-weight: bold; color: #fff; }

/* Logo */
.hero-section { text-align: center; padding: 60rpx 0 50rpx; }
.app-icon { width: 160rpx; height: 160rpx; margin: 0 auto 30rpx; background: linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,255,136,0.2)); border-radius: 36rpx; display: flex; justify-content: center; align-items: center; border: 3rpx solid rgba(0,212,255,0.3); }
.icon-text { font-size: 80rpx; }
.app-name { display: block; font-size: 56rpx; font-weight: bold; color: #fff; }
.app-version { display: block; font-size: 32rpx; color: #00d4ff; margin-top: 12rpx; }

/* 信息卡片 */
.info-card { background: rgba(20,40,60,0.6); border-radius: 20rpx; padding: 36rpx 40rpx; margin-bottom: 50rpx; border: 1rpx solid rgba(0,212,255,0.1); }
.info-row { display: flex; padding: 24rpx 0; border-bottom: 1rpx solid rgba(255,255,255,0.05); }
.info-row:last-child { border-bottom: none; }
.info-label { width: 180rpx; font-size: 30rpx; color: #8aa; flex-shrink: 0; }
.info-value { flex: 1; font-size: 30rpx; color: #ddd; line-height: 1.6; }

/* 功能 */
.feature-section { margin-bottom: 50rpx; }
.section-title { font-size: 36rpx; font-weight: bold; color: #fff; display: block; margin-bottom: 30rpx; }
.feature-grid { display: flex; flex-wrap: wrap; gap: 20rpx; }
.feature-item { width: calc(25% - 15rpx); background: rgba(20,40,60,0.5); border-radius: 16rpx; padding: 30rpx 20rpx; text-align: center; border: 1rpx solid rgba(255,255,255,0.05); }
.feature-icon { display: block; font-size: 44rpx; margin-bottom: 12rpx; }
.feature-name { display: block; font-size: 28rpx; color: #fff; font-weight: bold; margin-bottom: 8rpx; }
.feature-desc { display: block; font-size: 24rpx; color: #688; }

/* 版权 */
.footer { text-align: center; padding: 30rpx 0; }
.footer-text { display: block; font-size: 26rpx; color: #555; margin-bottom: 8rpx; }
</style>
