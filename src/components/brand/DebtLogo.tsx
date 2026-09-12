import React from 'react';

interface DebtLogoProps {
  className?: string;
  size?: number;
}

export const DebtLogo: React.FC<DebtLogoProps> = ({ className = 'h-8 w-8', size = 32 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        {/* Shield outline */}
        <path
          d="M20 3L6 8.5V19.2C6 28.5 12 36.3 20 38.5C28 36.3 34 28.5 34 19.2V8.5L20 3Z"
          fill="#0F172A"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Currency ₹ Accent Symbol & Ascending Interest Graph */}
        <path
          d="M13 14H23M13 18H21M13 22H17L23 28"
          stroke="#34D399"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="27" cy="14" r="2.5" fill="#10B981" />
        <path
          d="M21 21L27 15"
          stroke="#10B981"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="2 2"
        />
      </svg>
    </div>
  );
};
