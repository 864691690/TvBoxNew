<template>
  <view class="page">
    <!-- 顶部搜索栏 -->
    <view class="search-header">
      <view class="search-box">
        <view class="keyboard-input" @click="focusKeyboard" :focusable="true">
          <text :class="['input-text', keyword ? '' : 'placeholder']">{{ keyword || '请输入搜索关键词' }}</text>
          <text class="cursor" v-if="keyboardVisible">|</text>
        </view>
        <view class="search-btn" @click="doSearch" :focusable="true">
          <text class="btn-text">搜索</text>
        </view>
        <view class="back-btn" @click="goBack" :focusable="true">
          <text class="back-text">返回</text>
        </view>
      </view>
    </view>

    <!-- 热搜榜 -->
    <view class="hot-section" v-if="!keyword && hotList.length">
      <text class="section-title">🔥 热搜榜</text>
      <view class="hot-list">
        <view
          v-for="(item, i) in hotList"
          :key="i"
          class="hot-item"
          @click="searchHot(item)"
          :focusable="true"
        >
          <text :class="['hot-num', i < 3 ? 'top' : '']">{{ i + 1 }}</text>
          <text class="hot-text">{{ item.vod_name }}</text>
          <text class="hot-remarks" v-if="item.vod_remarks">{{ item.vod_remarks }}</text>
        </view>
      </view>
    </view>

    <!-- 历史搜索 -->
    <view class="history-section" v-if="!keyword && historyList.length">
      <view class="section-header">
        <text class="section-title">🕐 历史搜索</text>
        <view class="clear-btn" @click="clearHistory" :focusable="true">
          <text>清空</text>
        </view>
      </view>
      <view class="history-list">
        <view
          v-for="(item, i) in historyList"
          :key="i"
          class="history-item"
          @click="searchHistory(item)"
          :focusable="true"
        >
          <text class="history-text">{{ item }}</text>
        </view>
      </view>
    </view>

    <!-- 搜索联想 -->
    <view class="suggest-section" v-if="keyword && suggestList.length && !resultList.length">
      <view
        v-for="item in suggestList"
        :key="item.vod_id"
        class="suggest-item"
        @click="goDetail(item.vod_id)"
        :focusable="true"
      >
        <text class="suggest-icon">🔍</text>
        <text class="suggest-text">{{ item.vod_name }}</text>
        <text class="suggest-year" v-if="item.vod_year">{{ item.vod_year }}</text>
      </view>
    </view>

    <!-- 大屏键盘（底部滑出、支持中文拼音） -->
    <view class="keyboard-panel" v-if="keyboardVisible" :class="'kb-mode-' + kbMode">
      <view class="keyboard-mask" @click="hideKeyboard"></view>
      <view class="keyboard-content">
        <!-- 头部：预览 + 关闭 -->
        <view class="kb-header">
          <view class="input-preview">
            <text class="preview-label">搜索：</text>
            <text class="preview-text">{{ keyword || ' ' }}</text>
            <text class="cursor-blink">|</text>
          </view>
          <view class="kb-close" @click="hideKeyboard" :focusable="true">
            <text class="close-icon">✕</text>
          </view>
        </view>

        <!-- T9 输入提示条 -->
        <view class="t9-digit-row" v-if="kbMode === 't9' && t9Buffer">
          <text class="t9-digit-label">T9:</text>
          <text class="t9-digit-text">{{ t9Buffer }}</text>
          <text class="t9-hint-text" v-if="t9SplitHint">→ {{ t9SplitHint }}</text>
        </view>

        <!-- 拼音候选区（横向滚动） -->
        <view class="pinyin-row" v-if="pinyinCandidates.length">
          <view class="pinyin-nav" v-if="pinyinPage > 0" @click="pinyinPrevPage" :focusable="true">
            <text>◀</text>
          </view>
          <scroll-view scroll-x="true" class="pinyin-scroll">
            <view class="pinyin-list">
              <view
                v-for="(c, i) in pinyinCandidates"
                :key="i"
                class="pinyin-item"
                @click="selectPinyin(c)"
                :focusable="true"
              >
                <text class="pinyin-text">{{ c }}</text>
              </view>
            </view>
          </scroll-view>
          <view class="pinyin-nav" v-if="(pinyinPage + 1) * 30 < pinyinAllCandidates.length" @click="pinyinNextPage" :focusable="true">
            <text>▶</text>
          </view>
        </view>

        <!-- 键盘切换标签 -->
        <view class="kb-tabs">
          <view :class="['kb-tab', kbMode === 't9' ? 'active' : '']" @click="switchKbMode('t9')" :focusable="true">
            <text class="tab-icon">🔢</text><text>T9拼音</text>
          </view>
          <view :class="['kb-tab', kbMode === 'abc' ? 'active' : '']" @click="switchKbMode('abc')" :focusable="true">
            <text class="tab-icon">🔤</text><text>字母</text>
          </view>
          <view :class="['kb-tab', kbMode === 'num' ? 'active' : '']" @click="switchKbMode('num')" :focusable="true">
            <text class="tab-icon">#</text><text>数字</text>
          </view>
        </view>

        <!-- T9 九宫格 3列 -->
        <view class="keyboard-grid t9-grid" v-if="kbMode === 't9'">
          <view
            v-for="tk in t9KeyList"
            :key="tk.digit"
            class="key-item t9-key"
            @click="inputT9Key(tk.digit)"
            :focusable="true"
          >
            <text class="t9-label">{{ tk.label }}</text>
            <text class="t9-digit">{{ tk.digit }}</text>
          </view>
        </view>

        <!-- 字母键盘 6列 -->
        <view class="keyboard-grid abc-grid" v-if="kbMode === 'abc'">
          <view
            v-for="key in abcKeys"
            :key="key"
            class="key-item abc-key"
            @click="inputKey(key)"
            :focusable="true"
          >
            <text class="key-text">{{ key }}</text>
          </view>
        </view>

        <!-- 数字键盘 5列 -->
        <view class="keyboard-grid num-grid" v-if="kbMode === 'num'">
          <view
            v-for="key in numKeys"
            :key="key"
            class="key-item num-key"
            @click="inputKey(key)"
            :focusable="true"
          >
            <text class="key-text">{{ key }}</text>
          </view>
        </view>

        <!-- 底部操作栏 -->
        <view class="keyboard-actions">
          <view class="key-action space" @click="inputSpace" :focusable="true" v-if="kbMode !== 't9'">
            <text>空格</text>
          </view>
          <view class="key-action backspace" @click="deleteKey" :focusable="true">
            <text>⌫</text>
          </view>
          <view class="key-action clear" @click="clearInput" :focusable="true">
            <text>清空</text>
          </view>
          <view class="key-action primary" @click="confirmInput" :focusable="true">
            <text>搜索</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view class="result-section" v-if="keyword && resultList.length">
      <view class="section-header">
        <text class="section-title">搜索结果 ({{ totalResults }})</text>
        <view class="more-btn" @click="loadMoreResults" :focusable="true" v-if="hasMoreResults">
          <text>加载更多</text>
        </view>
      </view>
      <scroll-view scroll-y class="result-scroll" @scrolltolower="loadMoreResults">
        <view class="result-grid">
          <view
            v-for="item in resultList"
            :key="item.vod_id"
            class="card"
            :focusable="true"
            @click="goDetail(item.vod_id)"
          >
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load />
            <view class="card-info">
              <text class="card-title">{{ item.vod_name }}</text>
              <text class="card-sub">{{ item.vod_year }} · {{ item.vod_area }}</text>
              <text class="card-remarks" v-if="item.vod_remarks">{{ item.vod_remarks }}</text>
            </view>
          </view>
        </view>
        <view class="load-more" v-if="loadingMore">
          <text class="loading-text">加载中...</text>
        </view>
      </scroll-view>
    </view>

    <!-- 空状态 -->
    <view class="empty-wrap" v-if="keyword && !loading && !resultList.length">
      <text class="empty-icon">🔍</text>
      <text class="empty-text">未找到"{{ keyword }}"相关内容</text>
    </view>

    <!-- 加载状态 -->
    <view class="loading-wrap" v-if="loading">
      <text class="loading-text">搜索中...</text>
    </view>
  </view>
</template>

<script>
import { searchVod, getVodList } from "@/api/vod"
import { DEFAULT_PIC, fixPicUrl } from "@/api/config"
import { autoFocus } from "@/utils/focus"
import { getPinyinCandidates } from "@/data/pinyinMap"
import { T9_KEYS, resolveT9 } from "@/utils/t9"

export default {
  data() {
    return {
      keyword: "",
      defaultPic: DEFAULT_PIC,
      keyboardVisible: false,
      kbMode: "t9", // t9 / abc / num
      pinyinBuffer: "",    // T9模式存数字序列，字母模式存字母
      t9Buffer: "",        // T9 输入的数字序列
      t9PinyinHints: [],   // T9 解析出的拼音提示
      t9SplitHint: "",     // 多音节拆分提示
      pinyinCandidates: [],
      pinyinAllCandidates: [],
      pinyinPage: 0,
      suggestTimer: null,
      suggestList: [],
      historyList: [],
      hotList: [],
      resultList: [],
      totalResults: 0,
      resultPage: 1,
      hasMoreResults: false,
      loading: false,
      loadingMore: false,
    }
  },
  computed: {
    t9KeyList() { return T9_KEYS },
    abcKeys() {
      return ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"]
    },
    numKeys() {
      return ["1","2","3","4","5","6","7","8","9","0"]
    },
  },
  onLoad() {
    this.loadHistory()
    this.loadHot()
  },
  onReady() {
    this.$nextTick(() => autoFocus(this.$el))
  },
  // P2: 电视返回键 - 键盘打开时先关闭键盘
  onBackPress(e) {
    if (this.keyboardVisible) {
      this.hideKeyboard()
      return true
    }
  },
  methods: {
    loadHistory() {
      try {
        this.historyList = uni.getStorageSync("search_history") || []
      } catch (e) {
        this.historyList = []
      }
    },
    async loadHot() {
      try {
        const res = await getVodList({ order: "hits", pg: 1 })
        this.hotList = (res.list || []).slice(0, 15).map(this.fixItem)
      } catch (e) {
        this.hotList = []
      }
    },
    fixItem(item) {
      return {
        ...item,
        vod_pic: this.fixPicUrl(item.vod_pic)
      }
    },
    fixPicUrl,
    // 键盘操作
    focusKeyboard() {
      this.keyboardVisible = true
      this.$nextTick(() => {
        // 自动聚焦键盘内第一个可聚焦元素（跳过关闭按钮，聚焦第一个模式标签）
        const panel = this.$el.querySelector('.keyboard-content')
        if (panel) {
          const firstKey = panel.querySelector('[focusable]')
          if (firstKey) {
            try { firstKey.focus() } catch (e) {}
          }
        }
      })
    },
    hideKeyboard() {
      this.keyboardVisible = false
      this.pinyinBuffer = ""
      this.t9Buffer = ""
      this.t9PinyinHints = []
      this.t9SplitHint = ""
      this.pinyinCandidates = []
      this.pinyinAllCandidates = []
      this.pinyinPage = 0
    },
    switchKbMode(mode) {
      this.kbMode = mode
      this.pinyinBuffer = ""
      this.t9Buffer = ""
      this.t9PinyinHints = []
      this.t9SplitHint = ""
      this.pinyinCandidates = []
      this.pinyinAllCandidates = []
      this.pinyinPage = 0
      // 切换后自动聚焦第一个按键
      this.$nextTick(() => {
        const grid = this.$el.querySelector('.keyboard-grid')
        if (grid) {
          const firstKey = grid.querySelector('[focusable]')
          if (firstKey) {
            try { firstKey.focus() } catch (e) {}
          }
        }
      })
    },
    // T9 九宫格按键
    inputT9Key(digit) {
      this.t9Buffer += digit
      this.pinyinBuffer = this.t9Buffer
      this.updateT9Candidates()
    },
    // 解析 T9 数字序列 → 候选汉字
    updateT9Candidates() {
      const result = resolveT9(this.t9Buffer)
      const { pinyinHints, chars, splitResults } = result
      
      // 构建拆分提示
      if (splitResults.length) {
        this.t9SplitHint = splitResults.map(s => s.pinyins[0] || s.digits).join(" + ")
      } else if (pinyinHints.length) {
        this.t9SplitHint = pinyinHints.slice(0, 5).join(" / ")
      } else {
        this.t9SplitHint = ""
      }
      
      this.t9PinyinHints = pinyinHints
      this.pinyinAllCandidates = chars
      this.pinyinPage = 0
      this.updatePinyinPage()
    },
    inputKey(key) {
      // abc 或 num 模式：直接追加到关键词
      this.keyword += key
    },
    inputSpace() {
      this.keyword += " "
    },
    updatePinyinCandidates() {
      // abc 模式（如果将来需要拼音输入）保留兼容
      const buf = this.pinyinBuffer.toLowerCase()
      if (!buf) {
        this.pinyinCandidates = []
        this.pinyinPage = 0
        return
      }
      // T9 模式已由 updateT9Candidates 处理
      if (this.kbMode === "t9") return
      // abc 模式的拼音解析（保留给未来扩展）
      const { exact, prefix } = getPinyinCandidates(buf)
      this.pinyinAllCandidates = [...exact, ...prefix]
      this.pinyinPage = 0
      this.updatePinyinPage()
    },
    updatePinyinPage() {
      const perPage = 30
      const start = this.pinyinPage * perPage
      this.pinyinCandidates = this.pinyinAllCandidates.slice(start, start + perPage)
    },
    pinyinPrevPage() {
      if (this.pinyinPage > 0) {
        this.pinyinPage--
        this.updatePinyinPage()
      }
    },
    pinyinNextPage() {
      if ((this.pinyinPage + 1) * 30 < this.pinyinAllCandidates.length) {
        this.pinyinPage++
        this.updatePinyinPage()
      }
    },
    selectPinyin(char) {
      this.keyword += char
      this.pinyinBuffer = ""
      this.t9Buffer = ""
      this.t9PinyinHints = []
      this.t9SplitHint = ""
      this.pinyinCandidates = []
      this.pinyinAllCandidates = []
      this.pinyinPage = 0
      this.triggerSuggest()
    },
    deleteKey() {
      // T9 模式：删除 T9 数字位
      if (this.kbMode === "t9" && this.t9Buffer) {
        this.t9Buffer = this.t9Buffer.slice(0, -1)
        this.pinyinBuffer = this.t9Buffer
        if (this.t9Buffer) {
          this.updateT9Candidates()
        } else {
          this.t9PinyinHints = []
          this.t9SplitHint = ""
          this.pinyinCandidates = []
          this.pinyinAllCandidates = []
        }
        return
      }
      // 非 T9 模式：删除关键词字符
      this.keyword = this.keyword.slice(0, -1)
      if (this.keyword.length >= 2) this.triggerSuggest()
      else this.suggestList = []
    },
    clearInput() {
      this.keyword = ""
      this.pinyinBuffer = ""
      this.t9Buffer = ""
      this.t9PinyinHints = []
      this.t9SplitHint = ""
      this.pinyinCandidates = []
      this.pinyinAllCandidates = []
      this.pinyinPage = 0
      this.suggestList = []
    },
    confirmInput() {
      // T9 模式：如果还有候选，取第一个
      if (this.kbMode === "t9" && this.t9Buffer && this.pinyinCandidates.length > 0) {
        this.keyword += this.pinyinCandidates[0]
        this.t9Buffer = ""
        this.pinyinBuffer = ""
        this.t9PinyinHints = []
        this.t9SplitHint = ""
        this.pinyinCandidates = []
      }
      this.keyboardVisible = false
      this.doSearch()
    },
    // P1-9: 输入联想（去抖搜索）
    triggerSuggest() {
      if (this.suggestTimer) clearTimeout(this.suggestTimer)
      if (this.keyword.length < 2) { this.suggestList = []; return }
      this.suggestTimer = setTimeout(() => { this.fetchSuggest() }, 500)
    },
    async fetchSuggest() {
      if (!this.keyword || this.keyword.length < 2) return
      try {
        const res = await searchVod(this.keyword, 1)
        this.suggestList = (res.list || []).slice(0, 8).map(this.fixItem)
      } catch (e) { this.suggestList = [] }
    },
    doSearch() {
      if (!this.keyword.trim()) return
      this.saveHistory(this.keyword.trim())
      this.resultPage = 1
      this.resultList = []
      this.suggestList = []
      this.search(this.keyword.trim())
    },
    searchHot(item) {
      this.keyword = item.vod_name
      this.saveHistory(this.keyword)
      this.resultPage = 1
      this.resultList = []
      this.search(this.keyword)
    },
    searchHistory(keyword) {
      this.keyword = keyword
      this.resultPage = 1
      this.resultList = []
      this.search(keyword)
    },
    async search(wd) {
      this.loading = true
      try {
        const res = await searchVod(wd, this.resultPage)
        let list = (res.list || []).map(this.fixItem)
        // P4: 搜索结果按关键词匹配度排序
        if (this.resultPage === 1 && list.length > 1) {
          list = this.sortByMatch(wd, list)
        }
        if (this.resultPage === 1) {
          this.resultList = list
        } else {
          this.resultList = [...this.resultList, ...list]
        }
        this.totalResults = res.total || this.resultList.length
        this.hasMoreResults = list.length >= 20
      } catch (e) {
        this.resultList = this.resultPage === 1 ? [] : this.resultList
      }
      this.loading = false
    },
    // P4: 按关键词匹配度排序（完全匹配 > 前缀匹配 > 包含匹配 > 部分匹配）
    sortByMatch(wd, list) {
      const kw = wd.trim()
      const kwLower = kw.toLowerCase()
      const scored = list.map(item => {
        const name = (item.vod_name || '')
        const nameLower = name.toLowerCase()
        let score = 0
        if (name === kw) score = 100
        else if (nameLower === kwLower) score = 95
        else if (name.startsWith(kw)) score = 80
        else if (nameLower.startsWith(kwLower)) score = 75
        else if (name.includes(kw)) score = 60
        else if (nameLower.includes(kwLower)) score = 55
        else {
          let matchCount = 0
          for (const ch of kw) {
            if (name.includes(ch)) matchCount++
          }
          score = Math.round(matchCount / kw.length * 20)
        }
        return { item, score }
      })
      scored.sort((a, b) => b.score - a.score)
      return scored.map(s => s.item)
    },
    async loadMoreResults() {
      if (this.loadingMore || !this.hasMoreResults) return
      this.loadingMore = true
      this.resultPage++
      try {
        const res = await searchVod(this.keyword, this.resultPage)
        const list = (res.list || []).map(this.fixItem)
        this.resultList = [...this.resultList, ...list]
        this.hasMoreResults = list.length >= 20
      } catch (e) {}
      this.loadingMore = false
    },
    saveHistory(keyword) {
      try {
        let history = uni.getStorageSync("search_history") || []
        history = history.filter(h => h !== keyword)
        history.unshift(keyword)
        history = history.slice(0, 20)
        uni.setStorageSync("search_history", history)
        this.historyList = history
      } catch (e) {}
    },
    clearHistory() {
      try {
        uni.removeStorageSync("search_history")
        this.historyList = []
      } catch (e) {}
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/detail/index?id=${id}` })
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.page {
  background: linear-gradient(180deg, #0a1628 0%, #0f1a2a 100%);
  min-height: 100vh;
  padding: 60rpx;
}

/* 搜索栏 */
.search-header { margin-bottom: 60rpx; }
.search-box { display: flex; gap: 20rpx; }
.keyboard-input {
  flex: 1;
  padding: 24rpx 40rpx;
  background: rgba(0, 212, 255, 0.1);
  border: 2rpx solid rgba(0, 212, 255, 0.3);
  border-radius: 16rpx;
  transition: all 0.2s ease;
}
.keyboard-input:focus { background: rgba(0, 212, 255, 0.2); border-color: #00d4ff; }
.input-text { font-size: 32rpx; color: #fff; }
.input-text.placeholder { color: #556; }
.cursor { margin-left: 4rpx; color: #00d4ff; animation: blink 1s infinite; }
@keyframes blink { 0%,50%{opacity:1} 51%,100%{opacity:0} }
.search-btn {
  padding: 24rpx 50rpx;
  background: linear-gradient(135deg, #00d4ff, #00a8ff);
  border-radius: 16rpx;
}
.search-btn:focus { transform: scale(1.08); box-shadow: 0 0 40rpx rgba(0,212,255,0.6); }
.btn-text { font-size: 32rpx; color: #fff; font-weight: bold; }
.back-btn { padding: 24rpx 40rpx; background: rgba(255,255,255,0.1); border-radius: 16rpx; }
.back-btn:focus { background: rgba(0,212,255,0.2); transform: scale(1.05); }
.back-text { font-size: 28rpx; color: #aaa; }

/* 热搜 */
.hot-section, .history-section, .result-section { margin-bottom: 50rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.section-title { font-size: 36rpx; font-weight: bold; color: #fff; margin-bottom: 24rpx; display: block; }
.hot-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.hot-item {
  display: flex; align-items: center;
  padding: 16rpx 24rpx;
  background: rgba(255,255,255,0.08);
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}
.hot-item:focus { background: rgba(0,212,255,0.2); border-color: #00d4ff; transform: scale(1.05); }
.hot-num { font-size: 28rpx; color: #666; margin-right: 12rpx; min-width: 36rpx; }
.hot-num.top { color: #ff6b35; font-weight: bold; }
.hot-text { font-size: 28rpx; color: #ccc; }
.hot-remarks { font-size: 28rpx; color: #00d4ff; margin-left: 10rpx; }

/* 搜索联想 */
.suggest-section { margin-bottom: 30rpx; }
.suggest-item {
  display: flex; align-items: center;
  padding: 20rpx 24rpx;
  background: rgba(255,255,255,0.06);
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}
.suggest-item:focus { background: rgba(0,212,255,0.15); border-color: rgba(0,212,255,0.5); transform: scale(1.02); }
.suggest-icon { font-size: 28rpx; margin-right: 16rpx; }
.suggest-text { font-size: 28rpx; color: #ccc; flex: 1; }
.suggest-year { font-size: 24rpx; color: #666; margin-left: 16rpx; }

/* 历史 */
.history-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.history-item {
  padding: 14rpx 28rpx;
  background: rgba(255,255,255,0.06);
  border-radius: 10rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}
.history-item:focus { background: rgba(0,212,255,0.15); border-color: rgba(0,212,255,0.5); }
.history-text { font-size: 26rpx; color: #aaa; }
.clear-btn { padding: 10rpx 24rpx; background: rgba(255,100,100,0.2); border-radius: 8rpx; }
.clear-btn text { font-size: 24rpx; color: #f66; }

/* ========== 键盘面板（底部滑出） ========== */
.keyboard-panel {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 500;
  display: flex; align-items: flex-end;
  animation: kbFadeIn 0.2s ease;
}
@keyframes kbFadeIn { from { opacity: 0; } to { opacity: 1; } }
.keyboard-mask {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.75);
}
.keyboard-content {
  position: relative; width: 100%;
  background: linear-gradient(180deg, #111d2e 0%, #0d1524 100%);
  border-radius: 32rpx 32rpx 0 0;
  padding: 28rpx 44rpx 20rpx;
  border-top: 3rpx solid rgba(0,212,255,0.3);
  animation: kbSlideUp 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
  max-height: 85vh; overflow-y: auto;
}
@keyframes kbSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

/* 头部预览 */
.kb-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16rpx;
}
.input-preview {
  flex: 1;
  padding: 16rpx 24rpx;
  background: rgba(0,212,255,0.08);
  border: 2rpx solid rgba(0,212,255,0.18);
  border-radius: 12rpx;
  min-height: 52rpx;
  display: flex; align-items: center;
}
.preview-label { font-size: 24rpx; color: #6a8; margin-right: 8rpx; flex-shrink: 0; }
.preview-text  { font-size: 32rpx; color: #fff; min-width: 16rpx; }
.cursor-blink  { color: #00d4ff; font-size: 32rpx; margin-left: 2rpx; }
@keyframes blink { 0%,50%{opacity:1} 51%,100%{opacity:0} }
.cursor-blink  { animation: blink 1s infinite; }

.kb-close {
  width: 52rpx; height: 52rpx;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.06); border-radius: 26rpx;
  margin-left: 16rpx; flex-shrink: 0;
  border: 2rpx solid transparent; transition: all 0.15s;
}
.kb-close:focus { background: rgba(255,80,80,0.3); border-color: #f55; transform: scale(1.1); }
.close-icon { font-size: 26rpx; color: #aaa; }
.kb-close:focus .close-icon { color: #f55; }

/* T9 输入提示条 */
.t9-digit-row {
  display: flex; align-items: center; gap: 10rpx;
  padding: 10rpx 18rpx; margin-bottom: 10rpx;
  background: rgba(0,212,255,0.07); border-radius: 8rpx;
  border: 1rpx solid rgba(0,212,255,0.12);
}
.t9-digit-label { font-size: 20rpx; color: #6a8; flex-shrink: 0; }
.t9-digit-text  { font-size: 30rpx; color: #00d4ff; font-weight: bold; letter-spacing: 6rpx; }
.t9-hint-text   { font-size: 20rpx; color: #8c6; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 拼音候选区 */
.pinyin-row {
  display: flex; align-items: center; gap: 6rpx;
  margin-bottom: 10rpx; min-height: 56rpx;
}
.pinyin-nav {
  width: 44rpx; height: 44rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.08); border-radius: 8rpx;
  border: 1rpx solid rgba(255,255,255,0.15); transition: all 0.15s;
}
.pinyin-nav:focus { background: rgba(0,212,255,0.3); border-color: #00d4ff; }
.pinyin-nav text { font-size: 20rpx; color: #aaa; }
.pinyin-nav:focus text { color: #00d4ff; }
.pinyin-scroll { flex: 1; overflow: hidden; }
.pinyin-list  { display: flex; gap: 6rpx; white-space: nowrap; }
.pinyin-item  {
  padding: 6rpx 16rpx; background: rgba(0,212,255,0.1);
  border-radius: 6rpx; border: 1rpx solid rgba(0,212,255,0.2);
  transition: all 0.1s; flex-shrink: 0;
}
.pinyin-item:focus {
  background: rgba(0,212,255,0.38); border-color: #00d4ff;
  transform: scale(1.12); box-shadow: 0 0 14rpx rgba(0,212,255,0.4);
}
.pinyin-text { font-size: 26rpx; color: #00d4ff; }

/* 键盘模式标签 */
.kb-tabs {
  display: flex; gap: 12rpx; margin-bottom: 14rpx;
  justify-content: center;
}
.kb-tab {
  padding: 10rpx 28rpx;
  background: rgba(255,255,255,0.05); border-radius: 8rpx;
  border: 2rpx solid transparent; transition: all 0.15s;
  display: flex; align-items: center; gap: 4rpx;
}
.kb-tab text { font-size: 24rpx; color: #888; }
.kb-tab .tab-icon { font-size: 20rpx; }
.kb-tab:focus { background: rgba(0,212,255,0.08); border-color: rgba(0,212,255,0.4); }
.kb-tab.active { background: rgba(0,212,255,0.18); border-color: #00d4ff; }
.kb-tab.active text { color: #00d4ff; font-weight: bold; }

/* ========== 键盘网格 ========== */
.keyboard-grid {
  display: grid; gap: 12rpx;
  margin: 0 auto 16rpx;
}

/* T9 九宫格 3列 */
.t9-grid {
  grid-template-columns: repeat(3, 1fr);
  max-width: 660rpx;
}
.t9-key {
  height: 104rpx;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  background: linear-gradient(180deg, rgba(0,212,255,0.1) 0%, rgba(0,212,255,0.04) 100%);
  border: 3rpx solid rgba(0,212,255,0.15);
  border-radius: 14rpx; transition: all 0.12s ease;
}
.t9-key:focus {
  background: rgba(0,212,255,0.28);
  border-color: #00d4ff;
  transform: scale(1.06);
  box-shadow: 0 0 30rpx rgba(0,212,255,0.4), inset 0 0 16rpx rgba(0,212,255,0.08);
}
.t9-key .t9-label { font-size: 30rpx; color: #fff; font-weight: bold; line-height: 1.2; }
.t9-key .t9-digit { font-size: 20rpx; color: rgba(0,212,255,0.6); margin-top: 2rpx; }
.t9-key:focus .t9-digit { color: #00d4ff; }

/* 字母键盘 6列 */
.abc-grid {
  grid-template-columns: repeat(6, 1fr);
  max-width: 1140rpx;
}
.abc-key {
  aspect-ratio: 1.3; min-height: 66rpx;
  display: flex; justify-content: center; align-items: center;
  background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%);
  border: 2rpx solid rgba(255,255,255,0.06);
  border-radius: 10rpx; transition: all 0.1s ease;
}
.abc-key:focus {
  background: rgba(0,212,255,0.25);
  border-color: #00d4ff;
  transform: scale(1.1);
  box-shadow: 0 0 20rpx rgba(0,212,255,0.35);
}
.abc-key .key-text { font-size: 32rpx; color: #e8e8e8; font-weight: bold; }
.abc-key:focus .key-text { color: #fff; }

/* 数字键盘 5列 */
.num-grid {
  grid-template-columns: repeat(5, 1fr);
  max-width: 960rpx;
}
.num-key {
  aspect-ratio: 1.4; min-height: 66rpx;
  display: flex; justify-content: center; align-items: center;
  background: linear-gradient(180deg, rgba(0,212,255,0.06) 0%, rgba(0,212,255,0.01) 100%);
  border: 2rpx solid rgba(0,212,255,0.08);
  border-radius: 10rpx; transition: all 0.1s ease;
}
.num-key:focus {
  background: rgba(0,212,255,0.22);
  border-color: #00d4ff;
  transform: scale(1.1);
  box-shadow: 0 0 20rpx rgba(0,212,255,0.35);
}
.num-key .key-text { font-size: 32rpx; color: #e8e8e8; font-weight: bold; }
.num-key:focus .key-text { color: #fff; }

/* 底部操作栏 */
.keyboard-actions {
  display: flex; gap: 12rpx;
  justify-content: center; align-items: center;
  padding-top: 6rpx;
}
.key-action {
  padding: 14rpx 0;
  background: rgba(255,255,255,0.05);
  border-radius: 10rpx; border: 2rpx solid rgba(255,255,255,0.06);
  transition: all 0.12s ease;
  display: flex; align-items: center; justify-content: center;
}
.key-action:focus { transform: scale(1.06); }
.key-action text { font-size: 26rpx; color: #ccc; }

.key-action.space    { flex: 0 0 160rpx; }
.key-action.space:focus    { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.3); }
.key-action.backspace { flex: 0 0 72rpx; }
.key-action.backspace:focus { background: rgba(255,150,50,0.2); border-color: #fa3; }
.key-action.backspace:focus text { color: #fa3; }
.key-action.clear    { flex: 0 0 90rpx; }
.key-action.clear:focus    { background: rgba(255,80,80,0.2); border-color: #f55; }
.key-action.clear:focus text    { color: #f66; }
.key-action.primary  { flex: 0 0 130rpx; background: linear-gradient(135deg, #00d4ff, #0070d0); border-color: transparent; }
.key-action.primary:focus { transform: scale(1.08); box-shadow: 0 0 30rpx rgba(0,212,255,0.55); }
.key-action.primary text { color: #fff; font-weight: bold; }
.result-scroll { height: 65vh; }
.result-grid { display: flex; flex-wrap: wrap; gap: 24rpx; }
.card {
  width: 240rpx; background: rgba(20,40,60,0.6);
  border-radius: 16rpx; overflow: hidden; border: 3rpx solid transparent;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}
.card:focus { transform: scale(1.08); box-shadow: 0 0 0 3rpx #00d4ff, 0 0 30rpx rgba(0,212,255,0.6); }
.card-img { width: 240rpx; height: 340rpx; background: #1a2a3a; }
.card-info { padding: 12rpx 16rpx 16rpx; }
.card-title { display: block; font-size: 30rpx; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-sub { display: block; font-size: 28rpx; color: #888; margin-top: 6rpx; }
.card-remarks { display: block; font-size: 28rpx; color: #00d4ff; margin-top: 4rpx; }
.more-btn { padding: 12rpx 24rpx; background: rgba(0,212,255,0.15); border-radius: 8rpx; }
.more-btn text { font-size: 26rpx; color: #00d4ff; }
.load-more { text-align: center; padding: 30rpx 0; }
.loading-text { color: #666; font-size: 26rpx; }

/* 空状态 */
.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 150rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 30rpx; }
.empty-text { color: #666; font-size: 32rpx; }
.loading-wrap { text-align: center; padding: 40rpx 0; }
</style>
