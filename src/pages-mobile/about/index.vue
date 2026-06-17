<template>
  <view class="page">
    <!-- 顶部返回 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
        <text class="back-text">返回</text>
      </view>
      <text class="top-title">关于</text>
    </view>

    <scroll-view scroll-y class="page-scroll">
      <!-- Logo & 名称 -->
      <view class="hero-section">
        <view class="app-icon">
          <text class="icon-text"><svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg></text>
        </view>
        <text class="app-name">星途影视</text>
        <text class="app-version">v{{ version }}</text>
      </view>

      <!-- 应用信息 -->
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">应用描述</text>
          <text class="info-value">一款基于 uni-app 开发的跨平台影视应用，支持 TV 和手机端，提供沉浸式观影体验。</text>
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
          <text class="info-value">Android / Android TV / 电视盒子</text>
        </view>
      </view>

      <!-- 功能亮点 -->
      <view class="feature-section">
        <text class="section-title"><svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> 功能亮点</text>
        <view class="feature-grid">
          <view class="feature-item" v-for="f in features" :key="f.icon">
            <view class="feature-icon" v-html="f.icon"></view>
            <text class="feature-name">{{ f.name }}</text>
            <text class="feature-desc">{{ f.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 版权 -->
      <view class="footer">
        <text class="footer-text">Copyright © 2025-2026 星途影视</text>
        <text class="footer-text">仅供学习交流使用</text>
      </view>

      <view class="safe-bottom"></view>
    </scroll-view>
  </view>
</template>

<script>
import { VERSION_NAME } from "@/utils/version"

export default {
  data() {
    return {
      version: VERSION_NAME,
      features: [
        { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`, name: "海量资源", desc: "电影/电视剧/综艺/动漫全覆盖" },
        { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`, name: "智能搜索", desc: "系统输入法精准搜索" },
        { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`, name: "追剧提醒", desc: "自动检测剧集更新" },
        { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`, name: "倍速播放", desc: "0.5x ~ 2.0x 自由切换" },
        { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>`, name: "多线路切换", desc: "播放失败自动换源" },
        { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`, name: "续播记忆", desc: "自动记录播放进度" },
        { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`, name: "OTA 更新", desc: "自动检测新版本" },
        { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`, name: "全平台", desc: "TV + 手机 双端适配" },
      ]
    }
  },
  methods: {
    goBack() { uni.navigateBack() }
  }
}
</script>

<style scoped>
.page { background: #F5F5F5; min-height: 100vh; }
.page-scroll { height: calc(100vh - 90rpx); }

.top-bar {
  display: flex; align-items: center; padding: 16rpx 32rpx;
  padding-top: calc(24rpx + var(--status-bar-height, 48rpx));
  background: #fff; position: sticky; top: 0; z-index: 100;
}
.back-btn { display: flex; align-items: center; padding: 8rpx 16rpx; background: rgba(229,57,53,0.1); border-radius: 16rpx; }
.back-btn:active { opacity: 0.7; }
.back-icon { font-size: 40rpx; color: #E53935; margin-right: 4rpx; }
.back-text { font-size: 24rpx; color: #E53935; }
.top-title { font-size: 30rpx; color: #333; font-weight: bold; margin-left: 20rpx; }

.hero-section { text-align: center; padding: 50rpx 0 40rpx; }
.app-icon {
  width: 120rpx; height: 120rpx; margin: 0 auto 24rpx;
  background: rgba(229,57,53,0.1); border-radius: 28rpx;
  display: flex; justify-content: center; align-items: center;
  border: 2rpx solid rgba(229,57,53,0.3);
}
.icon-text { font-size: 64rpx; }
.app-name { display: block; font-size: 40rpx; font-weight: bold; color: #333; }
.app-version { display: block; font-size: 28rpx; color: #E53935; margin-top: 8rpx; }

.info-card {
  background: #fff; border-radius: 16rpx; padding: 24rpx 28rpx;
  margin: 0 32rpx 32rpx;
}
.info-row { display: flex; padding: 18rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.info-row:last-child { border-bottom: none; }
.info-label { width: 140rpx; font-size: 26rpx; color: #999; flex-shrink: 0; }
.info-value { flex: 1; font-size: 26rpx; color: #666; line-height: 1.5; }

.feature-section { margin-bottom: 40rpx; padding: 0 32rpx; }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; display: block; margin-bottom: 20rpx; }
.feature-grid { display: flex; flex-wrap: wrap; gap: 14rpx; }
.feature-item {
  width: calc(25% - 10.5rpx); background: #fff;
  border-radius: 16rpx; padding: 24rpx 14rpx; text-align: center;
}
.feature-icon { display: flex; justify-content: center; align-items: center; margin-bottom: 8rpx; min-height: 40rpx; }
.feature-name { display: block; font-size: 24rpx; color: #333; font-weight: bold; margin-bottom: 4rpx; }
.feature-desc { display: block; font-size: 20rpx; color: #999; }

.footer { text-align: center; padding: 20rpx 0; }
.footer-text { display: block; font-size: 24rpx; color: #999; margin-bottom: 6rpx; }

.safe-bottom { height: 40rpx; }
</style>
