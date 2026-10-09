import { useEffect } from 'react'

export default function OptimizedHeroBackground() {
  useEffect(() => {
    const existing = document.getElementById('unicorn-script')
    if (existing) return

    const script = document.createElement('script')
    script.id = 'unicorn-script'
    script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.4.0/dist/unicornStudio.umd.js'
    script.onload = () => {
      if ((window as any).UnicornStudio) {
        (window as any).UnicornStudio.init()
      }
    }
    document.head.appendChild(script)
  }, [])

  return (
    <div
      style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%' }}
      data-us-project="mphmwraF225iCJdgiLPD"
    />
  )
}
