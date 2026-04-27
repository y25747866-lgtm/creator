import React, { useEffect, useRef, useState } from 'react';
import UnicornScene from 'unicornstudio-react';

/**
 * OptimizedHeroBackground - Lazy-loaded background with performance optimization
 * Prevents freezing by deferring heavy animations and using requestIdleCallback
 */
const OptimizedHeroBackground = () => {
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Use requestIdleCallback to defer heavy background loading
    const id = requestIdleCallback(() => {
      setIsReady(true);
    }, { timeout: 2000 });

    return () => cancelIdleCallback(id);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: isReady ? 0.3 : 0,
        pointerEvents: 'none',
        transition: 'opacity 0.5s ease-in-out',
        willChange: 'opacity',
      }}
    >
      {isReady && (
        <UnicornScene
          projectId="mphmwraF225iCJdgjLPD"
          width="100%"
          height="100%"
          scale={1}
          dpi={1}
          sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@2.1.6/dist/unicornStudio.umd.js"
        />
      )}
    </div>
  );
};

export default OptimizedHeroBackground;
