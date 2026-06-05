// #ifdef H5
const API_HOST = ""
const API_PREFIX = "/api-proxy"
// #endif

// #ifdef APP-PLUS
const API_HOST = "https://move.wuyaoxuexi.cn"
const API_PREFIX = ""
// #endif

export const BASE_URL = API_HOST + API_PREFIX
export { API_HOST }

export const DEFAULT_PIC = "/static/no-cover.svg"

/**
 * 统一图片 URL 修复
 * - 相对路径补全完整 URL
 * - HTTP 升级 HTTPS
 * - 无扩展名补 .jpg
 */
export function fixPicUrl(url) {
  if (!url) return ""
  if (url.startsWith("/")) url = API_HOST + url
  if (url.startsWith("http://")) url = "https://" + url.substring(7)
  if (!url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i)) url = url + ".jpg"
  return url
}

function buildQuery(params) {
  const pairs = []
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    }
  }
  return pairs.join("&")
}

export const API = {
  // 分类列表
  categories: () => `${API_HOST}${API_PREFIX}/api.php/provide/vod/?ac=list&json=1`,
  // 视频列表
  list: (params = {}) => {
    const q = buildQuery({ ac: "videolist", json: "1", ...params })
    return `${API_HOST}${API_PREFIX}/api.php/provide/vod/?${q}`
  },
  // 视频详情
  detail: (id) => `${API_HOST}${API_PREFIX}/api.php/provide/vod/?ac=detail&ids=${id}&json=1`,
  // 搜索
  search: (wd, page = 1) => `${API_HOST}${API_PREFIX}/api.php/provide/vod/?ac=videolist&wd=${encodeURIComponent(wd)}&pg=${page}&json=1`,
  // 热门
  hot: (page = 1) => `${API_HOST}${API_PREFIX}/api.php/provide/vod/?ac=videolist&order=hits&pg=${page}&json=1`,
  // 最新
  new: (page = 1) => `${API_HOST}${API_PREFIX}/api.php/provide/vod/?ac=videolist&order=time&pg=${page}&json=1`,
  // 自定义筛选API（支持year/area/class/score/order服务端筛选）
  filter: (params = {}) => {
    const q = buildQuery({ ...params, json: '1' })
    return `${API_HOST}${API_PREFIX}/api.php/filter/index?${q}`
  },
}


