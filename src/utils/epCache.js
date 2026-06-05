import { getVodDetail } from "@/api/vod"

// 剧集类型 ID
const SERIES_TYPES = [2, 3, 4, 22]

/**
 * 统一 vod_id 为字符串 key
 */
function key(vodId) {
  return String(vodId)
}

/**
 * 判断是否为剧集类型（兼容字符串/数字 type_id）
 */
function isSeriesType(typeId) {
  return SERIES_TYPES.includes(Number(typeId))
}

/**
 * 从详情 vod_play_url 解析真实集数（取所有线路中最多的一条）
 */
export function parseEpisodeCount(detail) {
  const vodPlayUrl = detail.vod_play_url || ""
  if (!vodPlayUrl) return 0
  const urlRoutes = vodPlayUrl.split("$$$")
  let maxCount = 0
  for (const routeUrl of urlRoutes) {
    const count = (routeUrl || "").split("#").filter(e => e).length
    if (count > maxCount) maxCount = count
  }
  return maxCount
}

/**
 * 写入集数缓存
 */
export function saveEpCache(vodId, count, name) {
  try {
    const k = key(vodId)
    const raw = uni.getStorageSync("_epCountCache")
    const cache = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {}
    cache[k] = { count, name, time: Date.now() }
    // 只保留最近 200 条
    const keys = Object.keys(cache)
    if (keys.length > 200) {
      const sorted = keys.sort((a, b) => (cache[b].time || 0) - (cache[a].time || 0))
      const trimmed = {}
      sorted.slice(0, 200).forEach(k => { trimmed[k] = cache[k] })
      uni.setStorageSync("_epCountCache", trimmed)
    } else {
      uni.setStorageSync("_epCountCache", cache)
    }
    return cache
  } catch (e) { return null }
}

/**
 * 从 storage 读取集数缓存
 */
export function loadEpCache() {
  try {
    return uni.getStorageSync("_epCountCache") || {}
  } catch (e) { return {} }
}

/**
 * 批量预加载未缓存的剧集/综艺/动漫的集数
 * @param {Array} items - 列表项数组
 * @param {Object} cache - 当前缓存对象（用于判断哪些已缓存）
 * @returns {boolean} 是否有新数据写入
 */
export async function prefetchEpisodeCounts(items, cache) {
  const epCache = cache || loadEpCache()

  // 去重 + 只取剧集类型 + 未缓存
  const seen = new Set()
  const targets = items.filter(item => {
    if (!item.vod_id) return false
    if (!isSeriesType(item.type_id)) return false
    if (epCache[key(item.vod_id)]) return false
    if (seen.has(key(item.vod_id))) return false
    seen.add(key(item.vod_id))
    return true
  })

  console.log(`[epCache] 待预加载 ${targets.length} 项 (总 ${items.length} 项, 缓存命中 ${Object.keys(epCache).length} 条)`)
  if (targets.length === 0) return false

  const BATCH_SIZE = 2
  let updated = 0

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(item => getVodDetail(item.vod_id).catch(() => null))
    )

    for (let j = 0; j < batch.length; j++) {
      const res = results[j]
      if (res && res.list && res.list.length > 0) {
        const count = parseEpisodeCount(res.list[0])
        if (count > 0) {
          saveEpCache(batch[j].vod_id, count, batch[j].vod_name)
          updated++
        }
      }
    }
  }

  console.log(`[epCache] 预加载完成: ${updated}/${targets.length} 项已缓存`)
  return updated > 0
}

/**
 * 获取更正后的显示备注
 * @param {Object} item - 列表项，需有 vod_id, type_id, vod_remarks
 * @param {Object} cache - 缓存对象
 */
export function getRemarks(item, cache) {
  if (!cache || !item || !item.vod_id) return item.vod_remarks || ""
  const cached = cache[key(item.vod_id)]
  if (cached && cached.count > 0 && isSeriesType(item.type_id)) {
    return `共${cached.count}集`
  }
  return item.vod_remarks || ""
}
