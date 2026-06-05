/**
 * 集数缓存混入 - index.vue 和 category.vue 共用
 * 提供 loadEpCache / getRemarks / prefetchEpCounts 方法
 */
import { prefetchEpisodeCounts, loadEpCache, getRemarks } from "@/utils/epCache"

export default {
  data() {
    return {
      _epCache: {},
    }
  },
  methods: {
    loadEpCache() {
      this._epCache = loadEpCache()
    },
    getRemarks(item) {
      return getRemarks(item, this._epCache)
    },
    async prefetchEpCounts(items) {
      const updated = await prefetchEpisodeCounts(items, this._epCache)
      if (updated) this.loadEpCache()
    },
  }
}
