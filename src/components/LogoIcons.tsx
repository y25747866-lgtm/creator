import React from 'react';

export const PersonalBrandBlueprintIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 4C17.64 4 6 15.64 6 30c0 14.36 11.64 26 26 26s26-11.64 26-26S46.36 4 32 4zm0 48c-12.15 0-22-9.85-22-22s9.85-22 22-22 22 9.85 22 22-9.85 22-22 22z"/>
    <circle cx="32" cy="30" r="3"/>
    <circle cx="20" cy="20" r="2"/>
    <circle cx="44" cy="20" r="2"/>
    <circle cx="20" cy="40" r="2"/>
    <circle cx="44" cy="40" r="2"/>
    <line x1="32" y1="30" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="32" y1="30" x2="44" y2="20" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="32" y1="30" x2="20" y2="40" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="32" y1="30" x2="44" y2="40" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const WinningStoreIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8L8 16v8c0 12 24 24 24 24s24-12 24-24v-8L32 8z"/>
    <path d="M32 28c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
    <circle cx="20" cy="24" r="3"/>
    <circle cx="44" cy="24" r="3"/>
  </svg>
);

export const DetoxIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="10" width="40" height="44" rx="4" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="M20 24h24M20 32h24M20 40h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="32" cy="52" r="3" fill="currentColor"/>
  </svg>
);

export const SixFigureIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 32c0-13.25 10.75-24 24-24s24 10.75 24 24-10.75 24-24 24-24-10.75-24-24z" fill="none" stroke="currentColor" strokeWidth="2"/>
    <text x="32" y="40" textAnchor="middle" fontSize="24" fontWeight="bold" fill="currentColor">$</text>
  </svg>
);

export const CreatorHubIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="44" height="44" rx="4" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="M32 20v24M20 32h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="32" cy="32" r="8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const ScaleUpIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 52h40V12M52 12L12 52" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="52" cy="12" r="3" fill="currentColor"/>
  </svg>
);

export const LaunchPadIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 8L48 20v24c0 8-16 12-16 12s-16-4-16-12V20l16-12z" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="32" cy="28" r="4" fill="currentColor"/>
  </svg>
);

export const GrowthLabIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 50h44M14 46v-8M24 46v-16M34 46v-12M44 46v-20M54 46v-10" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  </svg>
);
