import { useEffect } from 'react'

export default function OptimizedHeroBackground() {
  useEffect(() => {
    const init = () => {
      const us = (window as any).UnicornStudio
      if (us && us.init) {
        us.init()
      } else {
        setTimeout(init, 100)
      }
    }
    init()
  }, [])

  return (
    <div
      data-us-project="mphmwraF225iCJdgjLPD"
      style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%' }}
    />
  )
}
