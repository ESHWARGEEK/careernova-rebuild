import React, { useEffect, useState } from 'react';

interface RadialProgressProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-purple-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
};

export const RadialProgress: React.FC<RadialProgressProps> = ({ score, size = 120, strokeWidth = 10 }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setProgress(score));
    return () => cancelAnimationFrame(animation);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const colorClass = getScoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="text-gray-200 dark:text-gray-700"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${colorClass} transition-all duration-1000 ease-out`}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-bold text-3xl ${colorClass}`}>
        {Math.round(progress)}
      </div>
    </div>
  );
};