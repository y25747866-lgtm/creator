/**
 * Performance optimization utilities to prevent freezing and jank
 */

/**
 * Debounce function to prevent excessive re-renders
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function to limit execution frequency
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Reduce motion preferences for accessibility and performance
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Optimize animations based on device capabilities
 */
export const getAnimationDuration = (baseMs: number): number => {
  if (prefersReducedMotion()) return 0;
  
  // Check if device has low performance
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    const memory = (navigator as any).deviceMemory;
    if (memory && memory < 4) return baseMs * 1.5; // Slower animations for low-memory devices
  }

  return baseMs;
};

/**
 * Lazy load images with intersection observer
 */
export const lazyLoadImage = (
  element: HTMLImageElement,
  callback?: () => void
): IntersectionObserver | null => {
  if (typeof IntersectionObserver === 'undefined') {
    element.src = element.dataset.src || '';
    callback?.();
    return null;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || '';
        img.classList.add('loaded');
        observer.unobserve(img);
        callback?.();
      }
    });
  });

  observer.observe(element);
  return observer;
};

/**
 * Disable animations on low-end devices
 */
export const shouldDisableAnimations = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  // Check for low-end device indicators
  const connection = (navigator as any).connection;
  if (connection && connection.effectiveType === '4g' && connection.saveData) {
    return true; // Save data mode enabled
  }

  if (typeof navigator.hardwareConcurrency !== 'undefined' && navigator.hardwareConcurrency < 2) {
    return true; // Single-core or dual-core device
  }

  return false;
};

/**
 * Request idle callback with fallback
 */
export const scheduleIdleTask = (callback: () => void, timeout: number = 2000): number => {
  if (typeof requestIdleCallback !== 'undefined') {
    return requestIdleCallback(callback, { timeout });
  }

  return setTimeout(callback, timeout) as unknown as number;
};
