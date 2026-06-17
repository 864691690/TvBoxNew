import { API } from "./config"

// 保存原始 uni.request，避免 App.vue 拦截器与本地重试冲突
const _rawRequest = uni.request

// ---- 请求限流队列 ----
const MAX_CONCURRENT = 3
let _running = 0
const _queue = []

function _next() {
  if (_queue.length === 0) return
  const slots = MAX_CONCURRENT - _running
  for (let i = 0; i < slots && _queue.length > 0; i++) {
    const { fn, resolve, reject } = _queue.shift()
    _running++
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => { _running--; _next() })
  }
}

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    _queue.push({ fn, resolve, reject })
    _next()
  })
}

// ---- 请求封装（优化重试逻辑） ----
// 仅网络超时/断连可重试，业务错误不重试
function request(url, maxRetries = 1) {
  return enqueue(() => _doRequest(url, maxRetries))
}

function _doRequest(url, retriesLeft) {
  return new Promise((resolve, reject) => {
    _rawRequest({
      url,
      method: "GET",
      timeout: 10000,
      success: (res) => {
        // 业务数据有效 → 直接返回，不重试
        if (res.data && (res.data.list || res.data.class || res.data.code === 1)) {
          resolve(res.data)
        } else if (res.data && res.data.code === 0) {
          // 服务端明确返回错误码，不重试
          reject(new Error(res.data.msg || "Server error"))
        } else {
          // 数据为空但没明确报错 → 重试一次
          if (retriesLeft > 0) {
            setTimeout(() => {
              _doRequest(url, retriesLeft - 1).then(resolve).catch(reject)
            }, 1500)
          } else {
            reject(new Error("No data"))
          }
        }
      },
      fail: (err) => {
        // 网络错误才重试
        if (retriesLeft > 0) {
          setTimeout(() => {
            _doRequest(url, retriesLeft - 1).then(resolve).catch(reject)
          }, 1500)
        } else {
          reject(err)
        }
      },
    })
  })
}

// 获取分类列表
export const getCategories = () => request(API.categories())

// 获取视频列表
export const getVodList = (params = {}) => request(API.list(params))

// 获取视频详情
export const getVodDetail = (id) => request(API.detail(id))

// 通过自定义筛选API获取数据（支持year/area/class/score/order服务端筛选）
export async function getFilteredVodList(catId, year, area, by, classTag, score, page = 1, limit = 20) {
  const params = { t: catId, page: page, limit: Math.min(limit, 48) }
  if (by) params.order = by
  if (year) params.year = year
  if (area) params.area = area
  if (classTag) params.class = classTag
  if (score) params.score = score
  return request(API.filter(params))
}

// 搜索
export const searchVod = (wd, page) => request(API.search(wd, page))
