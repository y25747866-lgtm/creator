import { useState, useEffect } from 'react';

/**
 * useLandingLoading - Hook to manage landing page skeleton loading state
 * Automatically hides the skeleton after a specified delay or when content is ready
 * 
 * @param initialDelay - Delay in milliseconds before hiding skeleton (default: 1500ms)
 * @param onLoadingComplete - Optional callback when loading is complete
 * @returns { isLoading, hideLoading }
 */
export const useLandingLoading = (
  initialDelay: number = 1500,
  onLoadingComplete?: () => void
) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set a timer to hide the skeleton
    const timer = setTimeout(() => {
      setIsLoading(false);
      onLoadingComplete?.();
    }, initialDelay);

    return () => clearTimeout(timer);
  }, [initialDelay, onLoadingComplete]);

  const hideLoading = () => {
    setIsLoading(false);
    onLoadingComplete?.();
  };

  return { isLoading, hideLoading };
};
