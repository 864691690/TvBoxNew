/**
 * 全局状态管理（轻量版）
 * 统一管理 Storage 读写，提供响应式状态
 * 各页面迁移后可逐步替代直接 uni.getStorageSync/setStorageSync
 */
import { reactive } from 'vue'

function load(key, fallback) {
  try {
    const v = uni.getStorageSync(key)
    return v !== undefined && v !== '' ? v : fallback
  } catch (e) { return fallback }
}

function save(key, value) {
  try { uni.setStorageSync(key, value) } catch (e) {}
}

const state = reactive({
  history: [],
  collects: [],
  follows: [],
  searchHistory: [],
  defaultQuality: 'high',
  subtitleEnabled: false,
  historySort: 'time',
  statusBarHeight: 0  // 状态栏高度（px），由 App.vue onLaunch 写入
})

export const store = {
  state,

  init() {
    state.history = load('play_history', [])
    state.collects = load('my_collects', [])
    state.follows = load('my_follows', [])
    state.searchHistory = load('search_history', [])
    state.defaultQuality = load('default_quality', 'high')
    state.subtitleEnabled = load('subtitle_enabled', false)
    state.historySort = load('_history_sort', 'time')
  },

  // 状态栏高度（px）
  setStatusBarHeight(px) {
    state.statusBarHeight = px || 0
  },
  getStatusBarHeight() {
    return state.statusBarHeight
  },

  // 播放历史（最多200条）
  addHistory(record) {
    const idx = state.history.findIndex(h => h.vod_id === record.vod_id)
    if (idx >= 0) state.history[idx] = record
    else state.history.unshift(record)
    if (state.history.length > 200) state.history.length = 200
    save('play_history', state.history)
  },

  getHistory(vodId) {
    return state.history.find(h => h.vod_id === vodId) || null
  },

  // 收藏（最多100条）
  isCollected(vodId) {
    return state.collects.some(c => c.vod_id === vodId)
  },
  toggleCollect(item) {
    const idx = state.collects.findIndex(c => c.vod_id === item.vod_id)
    if (idx >= 0) {
      state.collects.splice(idx, 1)
      save('my_collects', state.collects)
      return false
    } else {
      state.collects.push({ vod_id: item.vod_id, vod_name: item.vod_name, vod_pic: item.vod_pic, vod_remarks: item.vod_remarks })
      if (state.collects.length > 100) state.collects.length = 100
      save('my_collects', state.collects)
      return true
    }
  },

  // 追剧
  isFollowing(vodId) {
    return state.follows.some(f => f.vod_id === vodId)
  },
  toggleFollow(item) {
    const idx = state.follows.findIndex(f => f.vod_id === item.vod_id)
    if (idx >= 0) {
      state.follows.splice(idx, 1)
      save('my_follows', state.follows)
      return false
    } else {
      state.follows.push({ vod_id: item.vod_id, vod_name: item.vod_name, vod_pic: item.vod_pic, totalEp: item.totalEp || 0, newEp: 0 })
      save('my_follows', state.follows)
      return true
    }
  },

  // 搜索历史
  addSearchHistory(keyword) {
    if (!keyword) return
    state.searchHistory = state.searchHistory.filter(k => k !== keyword)
    state.searchHistory.unshift(keyword)
    if (state.searchHistory.length > 20) state.searchHistory.length = 20
    save('search_history', state.searchHistory)
  },
  clearSearchHistory() {
    state.searchHistory = []
    save('search_history', [])
  },

  // 设置
  getQuality() { return state.defaultQuality },
  setQuality(v) { state.defaultQuality = v; save('default_quality', v) },
  getSubtitle() { return state.subtitleEnabled },
  setSubtitle(v) { state.subtitleEnabled = v; save('subtitle_enabled', v) },
  getHistorySort() { return state.historySort },
  setHistorySort(v) { state.historySort = v; save('_history_sort', v) }
}
