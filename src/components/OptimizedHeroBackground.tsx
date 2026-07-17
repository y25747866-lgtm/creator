import React, { useEffect, useState, lazy, Suspense } from 'react';

// Lazy load the heavy library to reduce initial bundle size
const UnicornScene = lazy(() => import('unicornstudio-react'));

/**
 * OptimizedHeroBackground - Lazy-loaded background with performance optimization
 * Prevents freezing by deferring heavy animations and using requestIdleCallback
 */
const OptimizedHeroBackground = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Use requestIdleCallback to defer heavy background loading with fallback
    let id: number | NodeJS.Timeout;
    
    const activate = () => setIsReady(true);

    if (typeof requestIdleCallback !== 'undefined') {
      id = requestIdleCallback(activate, { timeout: 3000 });
      return () => cancelIdleCallback(id as number);
    } else {
      id = setTimeout(activate, 1000);
      return () => clearTimeout(id as NodeJS.Timeout);
    }
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: isReady ? 0.3 : 0,
        pointerEvents: 'none',
        transition: 'opacity 1s ease-in-out',
        willChange: 'opacity',
      }}
    >
      {isReady && (
        <Suspense fallback={null}>
          <UnicornScene
            projectId="mphmwraF225iCJdgjLPD"
            width="100%"
            height="100%"
            scale={1}
            dpi={1}
            sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@2.1.6/dist/unicornStudio.umd.js"
          />
        </Suspense>
      )}
    </div>
  );
};

export default OptimizedHeroBackground;
