import { useEffect } from 'react'

export default function OptimizedHeroBackground() {
  useEffect(() => {
    const existing = document.getElementById('unicorn-script')
    if (existing) return

    const script = document.createElement('script')
    script.id = 'unicorn-script'
    script.type = 'text/javascript'
    script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.4.1/dist/unicornStudio.umd.js'
    script.onload = () => {
      const us = (window as any).UnicornStudio
      if (us && us.init) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => us.init())
        } else {
          us.init()
        }
      }
    }
    ;(document.head || document.body).appendChild(script)
  }, [])

  return (
    <div
      data-us-project="mphmwraF225iCJdgjLPD"
      style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%' }}
    />
  )
}
