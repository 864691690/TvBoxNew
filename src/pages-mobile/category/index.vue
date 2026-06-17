<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="top-bar">
      <text class="title">发现</text>
      <view class="search-btn" @click="goSearch" v-html="searchIcon"></view>
    </view>

    <!-- 一级分类 -->
    <scroll-view scroll-x class="cat-scroll" :show-scrollbar="false">
      <view
        v-for="cat in topCategories"
        :key="cat.id"
        :class="['cat-tab', currentCat === cat.id ? 'active' : '']"
        @click="switchCat(cat.id)"
      >
        <text>{{ cat.name }}</text>
      </view>
    </scroll-view>

    <!-- 筛选区 -->
    <view class="filter-wrap">
      <!-- 类型 -->
      <view class="filter-row" v-if="subCategories.length">
        <view :class="['filter-tag', currentSub === 0 ? 'active' : '']" @click="switchSub(0)">
          <text>类型</text>
        </view>
        <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
          <view
            v-for="sub in subCategories"
            :key="sub.id"
            :class="['filter-tag', currentSub === sub.id ? 'active' : '']"
            @click="switchSub(sub.id)"
          >
            <text>{{ sub.name }}</text>
          </view>
        </scroll-view>
      </view>
      <!-- 地区 -->
      <view class="filter-row" v-if="areaOptions.length">
        <view :class="['filter-tag', activeArea === '' ? 'active' : '']" @click="setArea('')">
          <text>地区</text>
        </view>
        <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
          <view
            v-for="opt in areaOptions"
            :key="opt.v"
            :class="['filter-tag', activeArea === opt.v ? 'active' : '']"
            @click="setArea(opt.v)"
          >
            <text>{{ opt.n }}</text>
          </view>
        </scroll-view>
      </view>
      <!-- 年份 -->
      <view class="filter-row">
        <view :class="['filter-tag', activeYear === '' ? 'active' : '']" @click="setYear('')">
          <text>年份</text>
        </view>
        <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
          <view
            v-for="opt in yearOptions"
            :key="opt.v"
            :class="['filter-tag', activeYear === opt.v ? 'active' : '']"
            @click="setYear(opt.v)"
          >
            <text>{{ opt.n }}</text>
          </view>
        </scroll-view>
      </view>
      <!-- 排序 -->
      <view class="filter-row">
        <view :class="['filter-tag', activeOrder === '' ? 'active' : '']" @click="setOrder('')">
          <text>最新</text>
        </view>
        <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
          <view
            v-for="opt in sortOptions"
            :key="opt.v"
            :class="['filter-tag', activeOrder === opt.v ? 'active' : '']"
            @click="setOrder(opt.v)"
          >
            <text>{{ opt.n }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 内容网格 -->
    <scroll-view scroll-y class="grid-scroll" @scrolltolower="loadMore">
      <view class="grid" v-if="list.length">
        <view v-for="item in list" :key="item.vod_id" class="card" @click="goDetail(item.vod_id)">
          <view class="card-img-wrap">
            <image class="card-img" :src="item.vod_pic || defaultPic" mode="aspectFill" lazy-load />
            <view class="card-score" v-if="getScore(item)">{{ getScore(item) }}</view>
          </view>
          <text class="card-name">{{ item.vod_name }}</text>
        </view>
      </view>
      <view class="empty" v-else-if="!loading && !loadError">
        <text>该分类暂无内容</text>
      </view>
      <view class="empty" v-else-if="loadError">
        <text>加载失败</text>
        <view class="retry-btn" @click="loadList"><text>点击重试</text></view>
      </view>
      <view class="loading" v-if="loading"><text>加载中...</text></view>
      <view class="load-more" v-else-if="hasMore && !loading" @click="loadMore">
        <text class="load-more-text">加载更多</text>
      </view>
      <view class="nomore" v-else-if="!hasMore && list.length && !loading">
        <text class="nomore-text">— 没有更多了 —</text>
      </view>
    </scroll-view>

  </view>
</template>

<script>
import { DEFAULT_PIC, fixPicUrl } from "@/api/config"
import { getVodList, getFilteredVodList } from "@/api/vod"
import epMixin from "@/mixins/epMixin"

// 真实 type_id 体系（资源站实际数据）：
// 1=电影 2=连续剧 3=综艺 4=动漫 22=体育
// 父分类的 id 就是它的真实 type_id；sub 是子分类 type_id 列表
// AREA_MAP 也用真实 area 名（"中国"/"香港"等）— 后端 vod_area 字段值
const CATEGORY_CONFIG = {
  1: { name: "电影", subs: [
    { id: 6, name: "动作片" }, { id: 7, name: "喜剧片" }, { id: 8, name: "爱情片" },
    { id: 9, name: "科幻片" }, { id: 10, name: "恐怖片" }, { id: 11, name: "剧情片" },
    { id: 12, name: "战争片" }, { id: 33, name: "伦理片" }, { id: 34, name: "动漫电影" },
  ]},
  2: { name: "电视剧", subs: [
    { id: 13, name: "国产剧" }, { id: 14, name: "港台剧" }, { id: 15, name: "日韩剧" },
    { id: 16, name: "欧美剧" }, { id: 20, name: "短剧" }, { id: 23, name: "泰剧" },
  ]},
  3: { name: "综艺", subs: [] },
  4: { name: "动漫", subs: [
    { id: 25, name: "国产动漫" }, { id: 26, name: "日本动漫" }, { id: 27, name: "欧美动漫" },
  ]},
  22: { name: "体育", subs: [
    { id: 28, name: "足球" }, { id: 29, name: "篮球" }, { id: 30, name: "排球" },
    { id: 31, name: "台球" }, { id: 32, name: "其他赛事" },
  ]},
}

const AREA_MAP = {
  1: [ // 电影
    { n: "中国", v: "大陆" }, { n: "香港", v: "香港" }, { n: "台湾", v: "台湾" },
    { n: "美国", v: "美国" }, { n: "日本", v: "日本" }, { n: "韩国", v: "韩国" }, { n: "英国", v: "英国" },
  ],
  2: [ // 电视剧
    { n: "中国", v: "大陆" }, { n: "香港", v: "香港" }, { n: "台湾", v: "台湾" },
    { n: "美国", v: "美国" }, { n: "日本", v: "日本" }, { n: "韩国", v: "韩国" }, { n: "英国", v: "英国" },
  ],
  4: [ // 动漫
    { n: "中国", v: "大陆" }, { n: "日本", v: "日本" }, { n: "美国", v: "美国" }, { n: "韩国", v: "韩国" },
  ],
}

export default {
  mixins: [epMixin],
  data() {
    return {
      searchIcon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
      // currentCat 存真实 type_id（不是 category 内部 id）
      currentCat: 2,  // 默认电视剧
      currentSub: 0,  // 0 = 父分类全集；>0 = 子分类 type_id
      activeArea: "",
      activeYear: "",
      activeOrder: "",
      sortOptions: [{ n:"最热",v:"hits"},{ n:"评分",v:"score"}],
      yearOptions: [
        { n:"2026",v:"2026"},{ n:"2025",v:"2025"},{ n:"2024",v:"2024"},
        { n:"2023",v:"2023"},{ n:"2022",v:"2022"},{ n:"2021",v:"2021"},
      ],
      list: [], page: 1, hasMore: true, loading: true, loadError: false,
      defaultPic: DEFAULT_PIC,
    }
  },
  computed: {
    topCategories() {
      // 返回用于一级 tab 显示的分类（带 id=name 形式）
      return Object.entries(CATEGORY_CONFIG).map(([id, c]) => ({ id: Number(id), name: c.name }))
    },
    subCategories() { const cfg = CATEGORY_CONFIG[this.currentCat]; return cfg ? cfg.subs : [] },
    areaOptions() { return AREA_MAP[this.currentCat] || [] }
  },
  onShow() { this.loadEpCache() },
  onLoad(query) {
    if (query && query.cat) {
      const id = Number(query.cat)
      // 兼容旧 category 内部 id + 新真实 type_id
      // 旧的 category 内部 id: 1=电视剧, 2=短剧, 3=电影, 4=动漫, 5=综艺, 6=体育, 7=带女友
      const oldMap = { 1: 2, 2: 2, 3: 1, 4: 4, 5: 3, 6: 22, 7: 1 }
      const realId = oldMap[id] || id
      if (CATEGORY_CONFIG[realId]) {
        this.currentCat = realId
        this.currentSub = 0
      }
    }
    this.loadList()
  },
  methods: {
    // 取评分（兼容多种字段名）
    getScore(item) {
      if (!item) return ''
      const s = item.vod_douban_score || item.vod_score || item.vod_rating
        || item.vod_douban || item.score || item.rating
      if (s === undefined || s === null || s === '' || s === 0 || s === '0' || s === '0.0') return ''
      const n = parseFloat(s)
      if (isNaN(n) || n <= 0) return ''
      return n.toFixed(1)
    },
    switchCat(id) {
      if (this.currentCat === id) return
      this.currentCat = id
      this.currentSub = 0
      this.activeArea = ""
      this.resetAndLoad()
    },
    switchSub(id) { if (this.currentSub === id) return; this.currentSub = id; this.resetAndLoad() },
    setArea(v) { if (this.activeArea === v) return; this.activeArea = v; this.resetAndLoad() },
    setYear(v) { if (this.activeYear === v) return; this.activeYear = v; this.resetAndLoad() },
    setOrder(v) { if (this.activeOrder === v) return; this.activeOrder = v; this.resetAndLoad() },
    resetAndLoad() { this.page = 1; this.list = []; this.loadList() },

    async loadList() {
      this.loading = true; this.loadError = false
      console.log('[category] loadList page=%d needFilter=%s catId=%d', this.page,
        !!(this.activeYear || this.activeArea || this.activeOrder),
        this.currentSub > 0 ? this.currentSub : this.currentCat)
      try {
        const catId = this.currentSub > 0 ? this.currentSub : this.currentCat
        const needFilter = this.activeYear || this.activeArea || this.activeOrder
        if (needFilter) {
          await this.loadListFilterApi(catId)
        } else {
          await this.loadListVodApi(catId)
        }
        setTimeout(() => { this.prefetchEpCounts(this.list) }, 500)
      } catch (e) {
        console.error('[category] loadList ERROR:', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
        this.loadError = true
        this.loading = false
      }
      this.loading = false
      uni.hideToast()
      console.log('[category] loadList done list=%d hasMore=%s loading=%s', this.list.length, this.hasMore, this.loading)
    },

    // 无筛选条件：用原生 videolist API + 并发子分类
    async loadListVodApi(catId) {
      const cfg = CATEGORY_CONFIG[this.currentCat]
      let typeIds = []
      if (this.currentSub > 0) {
        typeIds = [catId]
      } else {
        typeIds = cfg && cfg.subs.length > 0 ? cfg.subs.map(s => s.id) : [catId]
      }
      const allItems = []
      const seenIds = new Set()
      let pagecount = 0
      const results = await Promise.all(typeIds.map(async tid => {
        try {
          const res = await getVodList({ t: tid, pg: this.page, pagesize: 60 })
          if (res && res.pagecount) pagecount = res.pagecount
          return (res.list || []).map(item => ({ ...item, vod_pic: fixPicUrl(item.vod_pic) }))
        } catch (e) { return [] }
      }))
      for (const items of results) {
        for (const item of items) {
          if (!seenIds.has(item.vod_id)) { seenIds.add(item.vod_id); allItems.push(item) }
        }
      }
      if (this.page === 1) this.list = allItems
      else {
        const existIds = new Set(this.list.map(x => x.vod_id))
        allItems.forEach(item => { if (!existIds.has(item.vod_id)) this.list.push(item) })
      }
      // 用 pagecount 正确判断是否有下一页；无 pagecount 时回退到 items.length > 0
      this.hasMore = pagecount > 0 ? this.page < pagecount : results.some(items => items.length > 0)
      console.log('[category] vod API page=%d/%d items=%d hasMore=%s', this.page, pagecount, allItems.length, this.hasMore)
    },

    // 有筛选条件：用 filter API（默认每页48条，服务端限制最大值）
    async loadListFilterApi(catId) {
      console.log('[category] filter API catId=%d year=%s area=%s order=%s page=%d',
        catId, this.activeYear || '—', this.activeArea || '—', this.activeOrder || '—', this.page)
      const res = await getFilteredVodList(
        catId,
        this.activeYear || undefined,
        this.activeArea || undefined,
        this.activeOrder || undefined,
        undefined, undefined,
        this.page, 48
      )
      console.log('[category] filter API result pagecount=%s listLen=%d', res.pagecount, (res.list || []).length)
      const items = (res.list || []).map(item => ({ ...item, vod_pic: fixPicUrl(item.vod_pic) }))
      if (this.page === 1) this.list = items
      else {
        const existIds = new Set(this.list.map(x => x.vod_id))
        items.forEach(item => { if (!existIds.has(item.vod_id)) this.list.push(item) })
      }
      this.hasMore = res.pagecount ? this.page < res.pagecount : items.length > 0
    },

    loadMore() {
      console.log('[category] loadMore clicked loading=%s hasMore=%s', this.loading, this.hasMore)
      if (this.loading) { uni.showToast({ title: '加载中…', icon: 'none', duration: 800 }); return }
      this.page++
      uni.showToast({ title: `第${this.page}页…`, icon: 'none', duration: 800 })
      this.loadList()
    },
    goDetail(id) { uni.navigateTo({ url: `/pages-mobile/detail/index?id=${id}` }) },
    goSearch() {
      console.log('[category] goSearch clicked')
      uni.navigateTo({ url: '/pages-mobile/search/index' })
    },
  }
}
</script>

<style scoped>
.page { background: #F5F5F5; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
.top-bar {
  display: flex; justify-content: center; align-items: center;
  padding: 20rpx 32rpx;
  padding-top: calc(30rpx + var(--status-bar-height, 48rpx));
  background: #fff; position: relative; flex-shrink: 0;
}
.title { font-size: 36rpx; font-weight: bold; color: #333; }
.search-btn { position: absolute; right: 32rpx; font-size: 32rpx; }

.cat-scroll { white-space: nowrap; padding: 16rpx 32rpx; background: #fff; flex-shrink: 0; }
.cat-tab {
  display: inline-block; padding: 10rpx 28rpx; margin-right: 16rpx;
  border-radius: 32rpx; background: #F5F5F5;
}
.cat-tab text { font-size: 26rpx; color: #666; }
.cat-tab.active { background: #E53935; }
.cat-tab.active text { color: #fff; font-weight: bold; }

.filter-wrap { background: #fff; padding: 8rpx 0; flex-shrink: 0; }
.filter-row { display: flex; align-items: center; padding: 8rpx 0; }
.filter-tag {
  display: inline-block; padding: 6rpx 20rpx; margin: 0 8rpx; border-radius: 8rpx;
  background: #F5F5F5; white-space: nowrap; flex-shrink: 0;
}
.filter-tag text { font-size: 24rpx; color: #666; }
.filter-tag.active { background: #E53935; }
.filter-tag.active text { color: #fff; }
.filter-scroll { display: inline-block; white-space: nowrap; flex: 1; height: 60rpx; }

.grid-scroll { height: calc(100vh - 400rpx); min-height: 300rpx; padding: 16rpx 24rpx; }
.grid { display: flex; flex-wrap: wrap; }
.card { width: calc((100% - 24rpx) / 3); margin-right: 12rpx; margin-bottom: 24rpx; }
.card:nth-child(3n) { margin-right: 0; }
.card:active { opacity: 0.8; }
.card-img-wrap { position: relative; border-radius: 12rpx; overflow: hidden; }
.card-img { width: 100%; height: 280rpx; background: #e0e0e0; display: block; }
.card-score {
  position: absolute; bottom: 8rpx; right: 8rpx;
  padding: 4rpx 10rpx; background: rgba(0,0,0,0.6);
  border-radius: 8rpx; font-size: 22rpx; color: gold; font-weight: bold;
}
.card-name {
  display: block; margin-top: 10rpx; font-size: 26rpx; color: #333;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.empty { text-align: center; padding: 80rpx 0; color: #999; font-size: 26rpx; }
.retry-btn { display: inline-block; margin-top: 20rpx; padding: 12rpx 32rpx; background: #E53935; color: #fff; border-radius: 32rpx; }
.loading { text-align: center; padding: 30rpx 0; color: #999; font-size: 24rpx; }
.load-more { text-align: center; padding: 30rpx; }
.load-more-text { color: #E53935; font-size: 28rpx; }
.nomore { text-align: center; padding: 20rpx 0; }
.nomore-text { color: #999; font-size: 24rpx; }
</style>
