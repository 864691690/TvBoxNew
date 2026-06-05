/**
 * 统一时间格式化
 * @param {number} seconds - 秒数
 * @param {boolean} showHours - 是否显示小时 (H:MM:SS)
 * @returns {string}
 */
export function formatTime(seconds, showHours = true) {
  if (!seconds || seconds < 0) return "00:00"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const pad = (n) => String(n).padStart(2, "0")
  if (showHours && h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}
