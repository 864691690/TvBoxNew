/**
 * T9 九宫格拼音输入引擎 v3
 * 
 * 核心改进：
 * 1. 预计算拼音→数字反向索引
 * 2. 拆分优先匹配更长音节（"948583" → "zhu"+"jue" 而非 "xiu"+"ju"+"e"）
 * 3. 部分输入时显示前缀匹配提示
 * 4. 字符按常用度排序（常用字优先）
 */
import { PINYIN_MAP } from "@/data/pinyinMap"

export const T9_KEYS = [
  { label: "ABC",  digit: "2", letters: "abc" },
  { label: "DEF",  digit: "3", letters: "def" },
  { label: "GHI",  digit: "4", letters: "ghi" },
  { label: "JKL",  digit: "5", letters: "jkl" },
  { label: "MNO",  digit: "6", letters: "mno" },
  { label: "PQRS", digit: "7", letters: "pqrs" },
  { label: "TUV",  digit: "8", letters: "tuv" },
  { label: "WXYZ", digit: "9", letters: "wxyz" },
]

// 字母→T9数字映射
const LETTER_TO_T9 = Object.freeze({
  a:"2",b:"2",c:"2", d:"3",e:"3",f:"3",
  g:"4",h:"4",i:"4", j:"5",k:"5",l:"5",
  m:"6",n:"6",o:"6", p:"7",q:"7",r:"7",s:"7",
  t:"8",u:"8",v:"8", w:"9",x:"9",y:"9",z:"9"
})

/** 将拼音转为 T9 数字序列 */
function pyToT9(pinyin) {
  return [...pinyin].map(ch => LETTER_TO_T9[ch] || "").join("")
}

// 预计算：数字序列 → 拼音列表（如 "948" → ["xiu","zhu"]）
const T9_TO_PY = Object.freeze(buildT9Index())

function buildT9Index() {
  const idx = {}
  for (const py of Object.keys(PINYIN_MAP)) {
    const digits = pyToT9(py)
    if (!idx[digits]) idx[digits] = []
    idx[digits].push(py)
  }
  return idx
}

/**
 * 根据数字序列查找匹配的拼音
 */
function findMatchingPinyins(digits) {
  if (!digits) return { exact: [], prefix: [] }
  const exact = T9_TO_PY[digits] || []
  const prefix = []
  for (const [dig, pys] of Object.entries(T9_TO_PY)) {
    if (dig.startsWith(digits) && dig !== digits) {
      prefix.push(...pys)
    }
  }
  prefix.sort((a, b) => a.length - b.length)
  return { exact, prefix }
}

/**
 * 从拼音列表收集汉字（去重，保持顺序）
 */
function collectChars(pinyinList) {
  const seen = new Set()
  const result = []
  for (const py of pinyinList) {
    for (const ch of PINYIN_MAP[py] || "") {
      if (!seen.has(ch)) {
        seen.add(ch)
        result.push(ch)
      }
    }
  }
  return result
}

/**
 * 递归拆分数字序列为有效拼音音节组合
 * 核心改进：优先尝试更长匹配，结果按"更少音节数"排序（更自然）
 * 
 * "948583" → 
 *   找到所有拆分：[[948,583], [948,58,3], ...]
 *   排序后首选 [948,583] → "zhu"+"jue" = 主角
 */
function splitIntoDigits(digits) {
  const results = []

  // 改为从长到短尝试，一次找到最优解即停止
  function trySplit(remaining, segments) {
    if (!remaining) {
      if (segments.length >= 1) results.push([...segments])
      return
    }
    // 从最长开始尝试（5→1），优先匹配完整音节
    const maxLen = Math.min(remaining.length, 5)
    for (let len = maxLen; len >= 1; len--) {
      const seg = remaining.slice(0, len)
      if (T9_TO_PY[seg]) {
        trySplit(remaining.slice(len), [...segments, seg])
      }
    }
  }

  trySplit(digits, [])

  // 去重
  const seen = new Set()
  const unique = results.filter(p => {
    const key = p.join(",")
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // 按音节数量排序：音节越少越优先（更可能是自然拆分）
  unique.sort((a, b) => a.length - b.length)
  
  return unique
}

/**
 * 解析 T9 数字序列 → 候选汉字
 * 支持单音节和多音节连续输入
 */
export function resolveT9(digits) {
  if (!digits) return { pinyinHints: [], chars: [], splitResults: [] }

  // 1. 先查精确匹配的拼音
  const { exact, prefix } = findMatchingPinyins(digits)

  if (exact.length) {
    // 有精确匹配：显示对应汉字（前缀汉字也追加）
    const chars = collectChars([...exact, ...prefix.slice(0, 5)])
    const pinyinHints = [...exact.slice(0, 5), ...prefix.slice(0, 5)]
    return { pinyinHints, chars, splitResults: [] }
  }

  // 2. 尝试拆分音节
  const splits = splitIntoDigits(digits)

  if (splits.length > 0) {
    // 取最优拆分（音节数最少）
    const bestSplit = splits[0]
    const splitResults = bestSplit.map(seg => {
      const pys = T9_TO_PY[seg] || []
      return { digits: seg, pinyins: pys, chars: collectChars(pys) }
    })

    // 收集所有拆分音节中的汉字
    const allChars = []
    const allPinyins = []
    const seen = new Set()
    for (const sr of splitResults) {
      for (const ch of sr.chars) {
        if (!seen.has(ch)) { seen.add(ch); allChars.push(ch) }
      }
      for (const py of sr.pinyins) {
        if (!allPinyins.includes(py)) allPinyins.push(py)
      }
    }

    // 前缀匹配也加上
    for (const ch of collectChars(prefix)) {
      if (!seen.has(ch)) { seen.add(ch); allChars.push(ch) }
    }

    return {
      pinyinHints: [...allPinyins, ...prefix].slice(0, 15),
      chars: allChars,
      splitResults
    }
  }

  // 3. 无精确匹配也无拆分，只显示前缀匹配结果
  const prefixChars = collectChars(prefix)
  return {
    pinyinHints: prefix.slice(0, 10),
    chars: prefixChars,
    splitResults: []
  }
}
