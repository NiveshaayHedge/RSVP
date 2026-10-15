import { useEffect, useRef } from 'react'
import { startGoldDust } from '../effects.js'

/** Full-size decorative canvas inside a positioned parent. */
export default function GoldDust({ color, density, alphaMin, alphaMax }) {
  const ref = useRef(null)
  useEffect(() => startGoldDust(ref.current, { color, density, alphaMin, alphaMax }), [color, density, alphaMin, alphaMax])
  return <canvas ref={ref} className="dust" aria-hidden="true" />
}
