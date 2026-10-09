import React, { lazy, Suspense, useEffect, useState } from 'react';

const SPLINE_URL = 'https://prod.spline.design/mphmwraF225iCJdgiLPD/scene.splinecode';
const SPLINE_VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@1.9.96/build/spline-viewer.js';

type SplineViewerProps = {
  url: string;
};

/**
 * Load the Spline viewer only after the hero content has had a chance to paint.
 * The fallback remains the hero's static #0a0a0a background while the scene loads.
 */
const SplineViewer = ({ url }: SplineViewerProps) => {
  const [isViewerReady, setIsViewerReady] = useState(
    () => typeof customElements !== 'undefined' && !!customElements.get('spline-viewer'),
  );

  useEffect(() => {
    if (isViewerReady) return;

    let isMounted = true;
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SPLINE_VIEWER_SCRIPT}"]`);

    const markReady = () => {
      if (isMounted) setIsViewerReady(true);
    };

    if (!script) {
      script = document.createElement('script');
      script.type = 'module';
      script.src = SPLINE_VIEWER_SCRIPT;
      script.setAttribute('fetchpriority', 'low');
      script.addEventListener('load', markReady, { once: true });
      document.head.appendChild(script);
    } else if (customElements.get('spline-viewer')) {
      markReady();
    } else {
      customElements.whenDefined('spline-viewer').then(markReady);
    }

    return () => {
      isMounted = false;
    };
  }, [isViewerReady]);

  if (!isViewerReady) return null;

  return React.createElement('spline-viewer', {
    url,
    'aria-hidden': 'true',
    style: { width: '100%', height: '100%', display: 'block' },
  });
};

// Keep the heavy Spline viewer out of the initial render bundle.
const LazySplineViewer = lazy(() => Promise.resolve({ default: SplineViewer }));

const OptimizedHeroBackground = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Let the hero text and CTA paint before loading the background scene.
    let id: number | ReturnType<typeof setTimeout>;

    const activate = () => setIsReady(true);

    if (typeof requestIdleCallback !== 'undefined') {
      id = requestIdleCallback(activate, { timeout: 3000 });
      return () => cancelIdleCallback(id as number);
    }

    id = setTimeout(activate, 1000);
    return () => clearTimeout(id);
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
        backgroundColor: '#0a0a0a',
        opacity: isReady ? 0.3 : 1,
        pointerEvents: 'none',
        transition: 'opacity 1s ease-in-out',
        willChange: 'opacity',
      }}
    >
      {isReady && (
        <Suspense fallback={null}>
          <LazySplineViewer url={SPLINE_URL} />
        </Suspense>
      )}
    </div>
  );
};

export default OptimizedHeroBackground;
