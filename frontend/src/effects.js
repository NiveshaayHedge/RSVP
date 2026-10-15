// Decorative effects from the design: slow drifting gold dust on a canvas, and a small
// confetti burst when the RSVP button is pressed. Both switch off for reduced motion.

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Start the gold-dust animation on a canvas. Returns a cleanup function. */
export function startGoldDust(canvas, { color, density = 9000, alphaMin = 0.2, alphaMax = 0.6 }) {
  if (!canvas || typeof canvas.getContext !== 'function') return () => {}
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const reduce = reducedMotion()
  let W = 0
  let H = 0
  let particles = []
  let raf = 0
  let timer = 0
  let stopped = false

  function size() {
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = rect.width
    H = rect.height
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    particles = Array.from({ length: Math.round((W * H) / density) }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.5 + Math.random() * 1.4,
      vy: -(0.05 + Math.random() * 0.18),
      vx: (Math.random() - 0.5) * 0.08,
      ph: Math.random() * 6.28,
      sp: 0.6 + Math.random() * 1.4,
      star: Math.random() < 0.08,
    }))
  }

  function frame(ts) {
    if (stopped) return
    const t = (ts || 0) / 1000
    ctx.clearRect(0, 0, W, H)
    for (const p of particles) {
      if (!reduce) {
        p.y += p.vy
        p.x += p.vx
        if (p.y < -5) {
          p.y = H + 5
          p.x = Math.random() * W
        }
      }
      ctx.globalAlpha = alphaMin + alphaMax * Math.max(0, Math.sin(t * p.sp + p.ph))
      ctx.fillStyle = color
      if (p.star) {
        const s = p.r * 3.2
        ctx.beginPath()
        ctx.moveTo(p.x, p.y - s)
        ctx.lineTo(p.x + s * 0.22, p.y - s * 0.22)
        ctx.lineTo(p.x + s, p.y)
        ctx.lineTo(p.x + s * 0.22, p.y + s * 0.22)
        ctx.lineTo(p.x, p.y + s)
        ctx.lineTo(p.x - s * 0.22, p.y + s * 0.22)
        ctx.lineTo(p.x - s, p.y)
        ctx.lineTo(p.x - s * 0.22, p.y - s * 0.22)
        ctx.closePath()
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, 6.28)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    if (!reduce) raf = requestAnimationFrame(frame)
  }

  const resize = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      size()
      if (reduce) frame(0)
    }, 150)
  }

  size()
  frame(0)
  window.addEventListener('resize', resize)
  // The cover grows when fonts load; keep the canvas in step with its container.
  const observer = typeof ResizeObserver !== 'undefined' && canvas.parentElement ? new ResizeObserver(resize) : null
  if (observer) observer.observe(canvas.parentElement)

  return () => {
    stopped = true
    cancelAnimationFrame(raf)
    clearTimeout(timer)
    window.removeEventListener('resize', resize)
    if (observer) observer.disconnect()
  }
}

/** Festive little burst of gold flecks from an element (e.g. the RSVP button). */
export function burst(el) {
  if (!el || reducedMotion()) return
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const colours = ['#E8BC5A', '#F7E9BE', '#C8952E', '#FFF4D2']
  for (let i = 0; i < 28; i++) {
    const d = document.createElement('div')
    d.className = 'burst'
    d.style.left = `${cx}px`
    d.style.top = `${cy}px`
    d.style.background = colours[i % colours.length]
    document.body.appendChild(d)
    if (typeof d.animate !== 'function') {
      d.remove()
      continue
    }
    const angle = Math.random() * Math.PI * 2
    const dist = 60 + Math.random() * 90
    const anim = d.animate(
      [
        { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * dist - 4}px,${Math.sin(angle) * dist + 40}px) rotate(${Math.random() * 540}deg)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)' },
    )
    anim.onfinish = () => d.remove()
  }
}
