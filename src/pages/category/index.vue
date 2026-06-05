<template>
  <view class="page">
    <!-- 自定义顶部导航 -->
    <view class="nav-bar">
      <BackButton />
      <view class="nav-title">分类</view>
    </view>

    <!-- 一级分类标签 -->
    <view class="cat-tabs">
      <view
        v-for="cat in categories"
        :key="cat.id"
        :class="['cat-tab', currentCat === cat.id ? 'active' : '']"
        :focusable="true"
        @click="switchCat(cat.id)"
      >
        <text class="cat-text">{{ cat.name }}</text>
      </view>
    </view>

    <!-- 二级分类筛选 -->
    <view class="filter-section" v-if="subCategories.length">
      <view class="filter-row">
        <text class="filter-label">类型</text>
        <scroll-view scroll-x class="filter-scroll" :focusable="false">
          <view
            v-for="sub in subCategories"
            :key="sub.id"
            :class="['filter-tag', currentSub === sub.id ? 'active' : '']"
            :focusable="true"
            @click="switchSub(sub.id)"
          >
            <text class="tag-text">{{ sub.name }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 排序/地区/年份/类型标签/评分筛选 -->
    <view class="extra-filters">
      <view class="filter-row">
        <text class="filter-label">排序</text>
        <scroll-view scroll-x class="filter-scroll" :focusable="false">
          <view
            v-for="opt in sortOptions"
            :key="opt.v"
            :class="['filter-tag', activeOrder === opt.v ? 'active' : '']"
            :focusable="true"
            @click="setOrder(opt.v)"
          >
            <text class="tag-text">{{ opt.n }}</text>
          </view>
        </scroll-view>
      </view>
      <view class="filter-row" v-if="areaOptions.length">
        <text class="filter-label">地区</text>
        <scroll-view scroll-x class="filter-scroll" :focusable="false">
          <view
            v-for="opt in areaOptions"
            :key="opt.v"
            :class="['filter-tag', activeArea === opt.v ? 'active' : '']"
            :focusable="true"
            @click="setArea(opt.v)"
          >
            <text class="tag-text">{{ opt.n }}</text>
          </view>
        </scroll-view>
      </view>
      <view class="filter-row">
        <text class="filter-label">年份</text>
        <scroll-view scroll-x class="filter-scroll" :focusable="false">
          <view
            v-for="opt in yearOptions"
            :key="opt.v"
            :class="['filter-tag', activeYear === opt.v ? 'active' : '']"
            :focusable="true"
            @click="setYear(opt.v)"
          >
            <text class="tag-text">{{ opt.n }}</text>
          </view>
        </scroll-view>
      </view>
      <view class="filter-row" v-if="classOptions.length">
        <text class="filter-label">标签</text>
        <scroll-view scroll-x class="filter-scroll" :focusable="false">
          <view
            v-for="opt in classOptions"
            :key="opt.v"
            :class="['filter-tag', activeClass === opt.v ? 'active' : '']"
            :focusable="true"
            @click="setClass(opt.v)"
          >
            <text class="tag-text">{{ opt.n }}</text>
          </view>
        </scroll-view>
      </view>
      <view class="filter-row">
        <text class="filter-label">评分</text>
        <scroll-view scroll-x class="filter-scroll" :focusable="false">
          <view
            v-for="opt in scoreOptions"
            :key="opt.v"
            :class="['filter-tag', activeScore === opt.v ? 'active' : '']"
            :focusable="true"
            @click="setScore(opt.v)"
          >
            <text class="tag-text">{{ opt.n }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 宫格列表 -->
    <scroll-view scroll-y class="grid-scroll" @scrolltolower="loadMore">
      <view class="grid-list" v-if="list.length">
        <view
          v-for="item in list"
          :key="item.vod_id"
          class="grid-item"
          :focusable="true"
          @click="goDetail(item.vod_id)"
        >
          <image class="grid-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load />
          <view class="grid-info">
            <text class="grid-title">{{ item.vod_name }}</text>
            <text class="grid-sub">{{ item.vod_year || '' }} · {{ item.vod_area || '' }}</text>
            <text class="grid-remark" v-if="getRemarks(item)">{{ getRemarks(item) }}</text>
          </view>
        </view>
      </view>

      <view class="empty" v-else-if="!loading">
        <text class="empty-icon">📺</text>
        <text class="empty-text">{{ loadError ? '加载失败，请检查网络' : '该分类暂无内容' }}</text>
        <text class="empty-sub">{{ loadError ? '点击重试' : '换个筛选条件试试' }}</text>
        <view class="retry-btn" @click="loadList" :focusable="true" v-if="loadError"><text>🔄 重新加载</text></view>
      </view>

      <view class="load-more" v-if="hasMore && !loading" :focusable="true" @click="loadMore">
        <text class="load-more-text">加载更多</text>
      </view>
      <view class="loading-wrap" v-if="loading">
        <text class="loading-text">加载中...</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { DEFAULT_PIC, fixPicUrl } from "@/api/config"
import { getVodList, getFilteredVodList } from "@/api/vod"
import { autoFocus } from "@/utils/focus"
import epMixin from "@/mixins/epMixin"
import BackButton from "@/components/BackButton.vue"

// 苹果CMS实际分类ID（已验证 2026-06-02）
const CATEGORY_CONFIG = {
  1: {
    name: "电影",
    subs: [
      { id: 34, name: "动漫电影" },
      { id: 6, name: "动作片" },
      { id: 7, name: "喜剧片" },
      { id: 8, name: "爱情片" },
      { id: 9, name: "科幻片" },
      { id: 10, name: "恐怖片" },
      { id: 11, name: "剧情片" },
      { id: 33, name: "伦理片" },
      { id: 12, name: "战争片" },
    ]
  },
  2: {
    name: "连续剧",
    subs: [
      { id: 20, name: "短剧" },
      { id: 23, name: "泰剧" },
      { id: 13, name: "国产剧" },
      { id: 14, name: "港台剧" },
      { id: 15, name: "日韩剧" },
      { id: 16, name: "欧美剧" },
    ]
  },
  3: {
    name: "综艺",
    subs: []
  },
  4: {
    name: "动漫",
    subs: [
      { id: 25, name: "国产动漫" },
      { id: 26, name: "日本动漫" },
      { id: 27, name: "欧美动漫" },
    ]
  },
  22: {
    name: "体育",
    subs: [
      { id: 28, name: "足球" },
      { id: 29, name: "篮球" },
      { id: 31, name: "台球" },
      { id: 32, name: "其他赛事" },
    ]
  },
}

// 地区选项 - 匹配苹果CMS实际vod_area字段
const AREA_MAP = {
  1: [
    { n: "全部", v: "" }, { n: "大陆", v: "大陆" }, { n: "香港", v: "香港" },
    { n: "台湾", v: "台湾" }, { n: "美国", v: "美国" }, { n: "韩国", v: "韩国" },
    { n: "日本", v: "日本" }, { n: "法国", v: "法国" }, { n: "英国", v: "英国" },
    { n: "印度", v: "印度" }, { n: "泰国", v: "泰国" },
  ],
  2: [
    { n: "全部", v: "" }, { n: "大陆", v: "大陆" }, { n: "香港", v: "香港" },
    { n: "台湾", v: "台湾" }, { n: "美国", v: "美国" }, { n: "韩国", v: "韩国" },
    { n: "日本", v: "日本" }, { n: "泰国", v: "泰国" }, { n: "英国", v: "英国" },
  ],
  3: [
    { n: "全部", v: "" }, { n: "大陆", v: "大陆" }, { n: "香港", v: "香港" },
    { n: "台湾", v: "台湾" }, { n: "韩国", v: "韩国" }, { n: "日本", v: "日本" },
  ],
  4: [
    { n: "全部", v: "" }, { n: "大陆", v: "大陆" }, { n: "日本", v: "日本" },
    { n: "美国", v: "美国" }, { n: "韩国", v: "韩国" },
  ],
  22: [],
}

// 类型标签（vod_class字段，用includes匹配）
const CLASS_MAP = {
  1: [
    { n: "全部", v: "" }, { n: "动作", v: "动作" }, { n: "喜剧", v: "喜剧" },
    { n: "爱情", v: "爱情" }, { n: "科幻", v: "科幻" }, { n: "恐怖", v: "恐怖" },
    { n: "悬疑", v: "悬疑" }, { n: "战争", v: "战争" }, { n: "犯罪", v: "犯罪" },
    { n: "奇幻", v: "奇幻" }, { n: "动画", v: "动画" }, { n: "冒险", v: "冒险" },
  ],
  2: [
    { n: "全部", v: "" }, { n: "悬疑", v: "悬疑" }, { n: "都市", v: "都市" },
    { n: "古装", v: "古装" }, { n: "武侠", v: "武侠" }, { n: "爱情", v: "爱情" },
    { n: "科幻", v: "科幻" }, { n: "犯罪", v: "犯罪" }, { n: "战争", v: "战争" },
  ],
  3: [
    { n: "全部", v: "" }, { n: "真人秀", v: "真人秀" }, { n: "选秀", v: "选秀" },
    { n: "脱口秀", v: "脱口秀" }, { n: "音乐", v: "音乐" },
  ],
  4: [
    { n: "全部", v: "" }, { n: "热血", v: "热血" }, { n: "搞笑", v: "搞笑" },
    { n: "冒险", v: "冒险" }, { n: "科幻", v: "科幻" }, { n: "恋爱", v: "恋爱" },
    { n: "奇幻", v: "奇幻" },
  ],
  22: [],
}

export default {
  mixins: [epMixin],
  components: { BackButton },
  data() {
    return {
      categories: Object.entries(CATEGORY_CONFIG).map(([id, cfg]) => ({
        id: Number(id),
        name: cfg.name,
      })),
      currentCat: 1,
      currentSub: 0,
      activeOrder: "",
      activeArea: "",
      activeYear: "",
      activeClass: "",
      activeScore: "",
      sortOptions: [
        { n: "默认", v: "" },
        { n: "最热", v: "hits" },
        { n: "最新", v: "time" },
      ],
      yearOptions: [
        { n: "全部", v: "" },
        { n: "2026", v: "2026" }, { n: "2025", v: "2025" },
        { n: "2024", v: "2024" }, { n: "2023", v: "2023" },
        { n: "2022", v: "2022" }, { n: "2021", v: "2021" },
        { n: "2020", v: "2020" }, { n: "更早", v: "2019" },
      ],
      scoreOptions: [
        { n: "全部", v: "" },
        { n: "9分以上", v: "9" },
        { n: "8分以上", v: "8" },
        { n: "7分以上", v: "7" },
        { n: "6分以上", v: "6" },
      ],
      list: [],
      page: 1,
      hasMore: true,
      loading: true,
      loadError: false,
      defaultPic: DEFAULT_PIC,
      // 内部缓冲：存储已拉取的原始数据用于前端过滤
      _rawBuffer: [],
    }
  },
  computed: {
    subCategories() {
      const cfg = CATEGORY_CONFIG[this.currentCat]
      return cfg ? cfg.subs : []
    },
    areaOptions() {
      return AREA_MAP[this.currentCat] || []
    },
    classOptions() {
      return CLASS_MAP[this.currentCat] || []
    },
  },
  onLoad(options) {
    if (options.t) {
      this.currentCat = Number(options.t)
    } else {
      // P4: 记住上次浏览的分类Tab
      this.restoreLastCat()
    }
    if (options.order) {
      this.activeOrder = options.order
    }
    // P1-10: 恢复上次筛选状态
    this.restoreFilterState()
    this.loadEpCache()
    this.loadList()
  },
  onShow() {
    // 返回页面时不重置筛选条件
    // 刷新集数缓存（从详情页回来可能有新数据）
    this.loadEpCache()
  },
  onReady() {
    this.$nextTick(() => autoFocus(this.$el))
  },
  methods: {
    switchCat(id) {
      if (this.currentCat === id) return
      this.currentCat = id
      this.currentSub = 0
      this.activeArea = ""
      this.activeClass = ""
      // P4: 记住最后浏览的分类Tab
      this.saveLastCat()
      this.resetAndLoad()
    },
    switchSub(id) {
      if (this.currentSub === id) return
      this.currentSub = id
      this.resetAndLoad()
    },
    setOrder(v) {
      if (this.activeOrder === v) return
      this.activeOrder = v
      this.resetAndLoad()
    },
    setArea(v) {
      if (this.activeArea === v) return
      this.activeArea = v
      // 地区/年份筛选需要HTML服务端筛选，重新加载
      this.resetAndLoad()
    },
    setYear(v) {
      if (this.activeYear === v) return
      this.activeYear = v
      this.resetAndLoad()
    },
    setClass(v) {
      if (this.activeClass === v) return
      this.activeClass = v
      // 标签现在支持服务端筛选，重新加载
      this.resetAndLoad()
    },
    setScore(v) {
      if (this.activeScore === v) return
      this.activeScore = v
      // 评分现在支持服务端筛选
      this.resetAndLoad()
    },

    // 从原始缓冲中应用前端过滤
    applyFilter() {
      let filtered = this._rawBuffer
      if (this.activeArea) {
        const sel = this.activeArea.toLowerCase()
        filtered = filtered.filter(item => {
          const a = (item.vod_area || '').toLowerCase()
          return a.includes(sel)
        })
      }
      if (this.activeYear) {
        filtered = filtered.filter(item => {
          const y = String(item.vod_year || '')
          if (this.activeYear === '2019') {
            return y && Number(y) <= 2019
          }
          return y === this.activeYear
        })
      }
      if (this.activeClass) {
        const sel = this.activeClass.toLowerCase()
        filtered = filtered.filter(item => {
          const c = (item.vod_class || '').toLowerCase()
          return c.includes(sel)
        })
      }
      if (this.activeScore) {
        const minScore = Number(this.activeScore)
        filtered = filtered.filter(item => {
          const s = Number(item.vod_score || item.vod_douban_score || 0)
          return s >= minScore
        })
      }
      this.list = filtered
    },

    async loadList() {
      this.loading = true
      this.loadError = false
      try {
        // 分类ID：优先二级，否则一级
        const catId = this.currentSub > 0 ? this.currentSub : this.currentCat
        
        // 判断是否需要筛选API（有year/area/order参数时用自定义API，否则用原生API）
        const needFilter = this.activeYear || this.activeArea || this.activeOrder || this.activeClass || this.activeScore
        
        if (needFilter) {
          await this.loadListFilterApi(catId)
        } else {
          await this.loadListVodApi(catId)
        }

        // 后台预加载真实集数（数据渲染完成后）
        setTimeout(() => { this.prefetchEpCounts(this.list) }, 500)
      } catch (e) {
        console.error('[category] loadList fail:', e)
        this.loadError = true
      }
      this.loading = false
    },

    // 自定义筛选API（支持服务端year/area/class/order筛选）
    async loadListFilterApi(catId) {
      try {
        const res = await getFilteredVodList(
          catId,
          this.activeYear || undefined,
          this.activeArea || undefined,
          this.activeOrder || undefined,
          this.activeClass || undefined,
          this.activeScore || undefined,
          this.page,
          20
        )
        const items = (res.list || []).map(item => ({
          ...item,
          vod_pic: this.fixPicUrl(item.vod_pic),
        }))
        
        // 服务端筛选：直接替换或追加，不依赖 _rawBuffer
        if (this.page === 1) {
          this.list = items
        } else {
          const existIds = new Set(this.list.map(x => x.vod_id))
          for (const item of items) {
            if (!existIds.has(item.vod_id)) this.list.push(item)
          }
        }
        const pagecount = res.pagecount || 0
        this.hasMore = this.page < pagecount && items.length >= 20
        console.log('[category] filter API page=%d items=%d total=%d pages=%d',
          this.page, items.length, res.total, pagecount)
      } catch (e) {
        console.error('[category] filter API fail:', e)
        if (this.page === 1) this.list = []
      }
    },

    // 原生videolist API（无筛选条件时使用）
    async loadListVodApi(catId) {
      // 如果是一级分类且没选二级，并发请求所有子分类
      let typeIds = []
      if (this.currentSub > 0) {
        typeIds = [catId]
      } else {
        const cfg = CATEGORY_CONFIG[this.currentCat]
        typeIds = cfg && cfg.subs.length > 0
          ? cfg.subs.map(s => s.id)
          : [catId]
      }

      const allItems = []
      const seenIds = new Set()

      const requests = typeIds.map(async (tid) => {
        try {
          const params = { t: tid, pg: this.page }
          const res = await getVodList(params)
          return (res.list || []).map(item => ({
            ...item,
            vod_pic: this.fixPicUrl(item.vod_pic),
          }))
        } catch (e) {
          return []
        }
      })

      const results = await Promise.all(requests)
      for (const items of results) {
        for (const item of items) {
          if (!seenIds.has(item.vod_id)) {
            seenIds.add(item.vod_id)
            allItems.push(item)
          }
        }
      }

      if (this.page === 1) {
        this._rawBuffer = allItems
      } else {
        const bufIds = new Set(this._rawBuffer.map(x => x.vod_id))
        for (const item of allItems) {
          if (!bufIds.has(item.vod_id)) this._rawBuffer.push(item)
        }
      }
      this.applyFilter()
      // 如果所有子分类都返回了 >= 20 条数据，才认为还有更多
      this.hasMore = results.every(items => items.length >= 20)
      console.log('[category] vod API page=%d raw=%d filtered=%d hasMore=%s', this.page, allItems.length, this.list.length, this.hasMore)
    },

    fixPicUrl,
    resetAndLoad() {
      this.page = 1
      this._rawBuffer = []
      this.list = []
      this.saveFilterState()
      this.loadList()
    },
    // P1-10: 筛选状态持久化
    saveFilterState() {
      try {
        uni.setStorageSync("_category_filter", {
          currentCat: this.currentCat,
          currentSub: this.currentSub,
          activeOrder: this.activeOrder,
          activeArea: this.activeArea,
          activeYear: this.activeYear,
          activeClass: this.activeClass,
          activeScore: this.activeScore,
        })
      } catch (e) {}
    },
    restoreFilterState() {
      try {
        const saved = uni.getStorageSync("_category_filter")
        if (saved && saved.currentCat === this.currentCat) {
          this.currentSub = saved.currentSub || 0
          this.activeOrder = saved.activeOrder || ""
          this.activeArea = saved.activeArea || ""
          this.activeYear = saved.activeYear || ""
          this.activeClass = saved.activeClass || ""
          this.activeScore = saved.activeScore || ""
        }
      } catch (e) {}
    },
    // P4: 记住最后浏览的分类Tab
    saveLastCat() {
      try { uni.setStorageSync("_category_last_cat", this.currentCat) } catch (e) {}
    },
    restoreLastCat() {
      try {
        const saved = uni.getStorageSync("_category_last_cat")
        if (saved) this.currentCat = saved
      } catch (e) {}
    },
    loadMore() {
      if (this.loading) return
      this.page++
      this.loadList()
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/detail/index?id=${id}` })
    },
    // 后台预加载未缓存影片的真实集数
  },
}
</script>

<style scoped>
.page {
  background: linear-gradient(180deg, #0a1628 0%, #0f1a2a 100%);
  min-height: 100vh;
  padding: 0 50rpx;
}

/* 导航栏 */
.nav-bar {
  padding: 30rpx 0;
  display: flex;
  align-items: center;
  gap: 30rpx;
}
.back-btn {
  display: flex; align-items: center;
  padding: 12rpx 24rpx;
  background: rgba(0,212,255,0.15); border-radius: 12rpx;
  border: 2rpx solid rgba(0,212,255,0.3);
  transition: all 0.2s ease;
}
.back-btn:focus { transform: scale(1.08); background: rgba(0,212,255,0.3); box-shadow: 0 0 20rpx rgba(0,212,255,0.5); }
.back-icon { font-size: 44rpx; color: #00d4ff; margin-right: 12rpx; }
.back-text { font-size: 28rpx; color: #00d4ff; }
.nav-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
}

/* 一级分类 */
.cat-tabs {
  display: flex;
  gap: 24rpx;
  padding: 20rpx 0;
  margin-bottom: 10rpx;
}
.cat-tab {
  padding: 18rpx 44rpx;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}
.cat-tab:focus {
  background: rgba(0, 212, 255, 0.15);
  border-color: rgba(0, 212, 255, 0.5);
  transform: scale(1.05);
}
.cat-tab.active {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.3), rgba(0, 168, 255, 0.3));
  border-color: #00d4ff;
}
.cat-text { font-size: 32rpx; color: #aaa; }
.cat-tab.active .cat-text { color: #00d4ff; font-weight: bold; }

/* 二级分类 */
.filter-section {
  background: rgba(0, 212, 255, 0.05);
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

/* 通用筛选行 */
.extra-filters {
  margin-bottom: 20rpx;
}
.filter-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.filter-label {
  font-size: 26rpx;
  color: #688;
  width: 80rpx;
  flex-shrink: 0;
}
.filter-scroll {
  flex: 1;
  white-space: nowrap;
}
.filter-tag {
  display: inline-block;
  padding: 10rpx 28rpx;
  margin-right: 12rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}
.filter-tag:focus {
  background: rgba(0, 212, 255, 0.15);
  border-color: rgba(0, 212, 255, 0.4);
  transform: scale(1.05);
}
.filter-tag.active {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
}
.tag-text { font-size: 26rpx; color: #aaa; }
.filter-tag.active .tag-text { color: #00d4ff; }

/* 宫格列表 */
.grid-scroll {
  height: calc(100vh - 400rpx);
}
.grid-list {
  display: flex;
  flex-wrap: wrap;
  gap: 30rpx;
  padding: 10rpx 0;
}
.grid-item {
  width: 240rpx;
  background: rgba(20, 40, 60, 0.6);
  border-radius: 16rpx;
  overflow: hidden;
  border: 3rpx solid transparent;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}
.grid-item:focus {
  transform: scale(1.08);
  box-shadow: 0 0 0 3rpx #00d4ff, 0 0 30rpx rgba(0, 212, 255, 0.6);
}
.grid-img {
  width: 240rpx;
  height: 340rpx;
  background: #1a2a3a;
}
.grid-info {
  padding: 16rpx;
}
.grid-title {
  display: block;
  font-size: 30rpx;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.grid-sub {
  display: block;
  font-size: 28rpx;
  color: #888;
  margin-top: 6rpx;
}
.grid-remark {
  display: block;
  font-size: 28rpx;
  color: #00d4ff;
  margin-top: 6rpx;
}

/* 空状态 */
.empty { text-align: center; padding: 100rpx 0; }
.empty-icon { font-size: 120rpx; display: block; margin-bottom: 24rpx; }
.empty-text { color: #fff; font-size: 36rpx; display: block; margin-bottom: 16rpx; }
.empty-sub { color: #666; font-size: 26rpx; display: block; margin-bottom: 30rpx; }
.retry-btn { display: inline-block; padding: 20rpx 60rpx; background: rgba(0,212,255,0.2); border-radius: 12rpx; border: 2rpx solid #00d4ff; cursor: pointer; }
.retry-btn:focus { background: rgba(0,212,255,0.4); transform: scale(1.05); }
.retry-btn text { color: #00d4ff; font-size: 28rpx; }
.load-more { text-align: center; padding: 30rpx; }
.load-more-text { color: #00d4ff; font-size: 28rpx; }
.loading-wrap { text-align: center; padding: 30rpx; }
.loading-text { color: #666; font-size: 26rpx; }
</style>
