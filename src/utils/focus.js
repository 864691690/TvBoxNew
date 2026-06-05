/**
 * TV Focus management utility
 */

// Set focus to element, scroll into view
function setFocus(el) {
  if (!el) return
  el.focus && el.focus()
  el.scrollIntoViewIfNeeded && el.scrollIntoViewIfNeeded({ block: "nearest", behavior: "smooth" })
}

// Auto focus first focusable child
export function autoFocus(container) {
  if (!container) return
  const el = container.querySelector("[focusable]")
  if (el) setFocus(el)
}
