import { useEffect, useState } from 'react'

export default function OptimizedHeroBackground() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Show placeholder instantly, load animation after page is interactive
    const timer = setTimeout(() => {
      setVisible(true)
      const init = () => {
        const us = (window as any).UnicornStudio
        if (us && us.init) {
          us.init()
        } else {
          setTimeout(init, 100)
        }
      }
      init()
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%', background: '#0a0a0a' }}>
      <div
        data-us-project-src="/unicorn-scene.json"
        data-us-scale="0.5"
        data-us-dpi="1"
        style={{
          width: '100%',
          height: '100%',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease'
        }}
      />
    </div>
  )
}
