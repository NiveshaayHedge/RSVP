// Smooth in-page scrolling that behaves the same in every browser (CSS scroll-behavior is
// not supported on older iOS Safari). Honours the user's reduced-motion preference.

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function smoothScrollTo(target, { offset = 12 } = {}) {
  const el = typeof target === 'string' ? document.getElementById(target) : target
  if (!el) return

  const startY = window.scrollY
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  const endY = Math.min(Math.max(0, el.getBoundingClientRect().top + startY - offset), maxY)
  const distance = endY - startY
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduceMotion || Math.abs(distance) < 2 || typeof requestAnimationFrame !== 'function') {
    window.scrollTo(0, endY)
    return
  }

  // Longer trips take a little longer, within sensible bounds.
  const duration = Math.min(900, Math.max(450, Math.abs(distance) / 3))
  const html = document.documentElement
  const previousBehavior = html.style.scrollBehavior
  html.style.scrollBehavior = 'auto' // never let the browser double-smooth our frames
  const started = performance.now()

  function frame(now) {
    const t = Math.min(1, (now - started) / duration)
    window.scrollTo(0, startY + distance * easeInOutCubic(t))
    if (t < 1) requestAnimationFrame(frame)
    else html.style.scrollBehavior = previousBehavior
  }
  requestAnimationFrame(frame)
}
