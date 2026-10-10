import { useEffect, useRef } from 'react'

export default function OptimizedHeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const existing = document.getElementById('unicorn-script')
    if (existing) {
      if ((window as any).UnicornStudio) {
        (window as any).UnicornStudio.addScene({
          elementId: 'unicorn-hero',
          projectId: 'mphmwraF225iCJdgiLPD'
        })
      }
      return
    }

    const script = document.createElement('script')
    script.id = 'unicorn-script'
    script.src = 'https://cdn.unicorn.studio/v1.3.2/unicornStudio.umd.js'
    script.async = true
    script.onload = () => {
      if ((window as any).UnicornStudio) {
        (window as any).UnicornStudio.addScene({
          elementId: 'unicorn-hero',
          projectId: 'mphmwraF225iCJdgiLPD'
        })
      }
    }
    document.head.appendChild(script)

    return () => {
      if ((window as any).UnicornStudio) {
        (window as any).UnicornStudio.destroy?.()
      }
    }
  }, [])

  return (
    <div
      id="unicorn-hero"
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%' }}
    />
  )
}
