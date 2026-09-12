import React from 'react';

export const EmptyStateIllustration: React.FC<{ className?: string }> = ({ className = 'w-48 h-48' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Ambient glow circle */}
        <circle cx="100" cy="100" r="75" fill="#059669" fillOpacity="0.06" />
        <circle cx="100" cy="100" r="60" stroke="#059669" strokeOpacity="0.2" strokeDasharray="4 4" strokeWidth="1.5" />

        {/* Bank / Vault outline */}
        <rect x="52" y="70" width="96" height="74" rx="10" fill="#0F172A" stroke="#1E293B" strokeWidth="2" />
        
        {/* Vault Door inner ring */}
        <circle cx="100" cy="107" r="24" fill="#022C22" stroke="#059669" strokeWidth="2.5" />
        <circle cx="100" cy="107" r="10" fill="#059669" fillOpacity="0.2" stroke="#34D399" strokeWidth="1.5" />
        
        {/* Spokes */}
        <path d="M100 83V131" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
        <path d="M76 107H124" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
        <path d="M83 90L117 124" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M83 124L117 90" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />

        {/* Classical Pediment Header */}
        <path d="M46 70L100 42L154 70H46Z" fill="#1E293B" stroke="#059669" strokeWidth="2" strokeLinejoin="round" />
        
        {/* Floating INR Emblem */}
        <g transform="translate(132, 44)">
          <circle cx="18" cy="18" r="18" fill="#059669" />
          <path
            d="M13 11H23M13 15H21M13 19H17L22 25"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
};
