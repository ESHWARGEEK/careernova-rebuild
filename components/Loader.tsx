import React, { useState, useEffect } from 'react';

const loadingMessages = [
  "Analyzing skills and experiences...",
  "Mapping potential career paths...",
  "Checking current job market demand...",
  "Crafting your personalized advice...",
  "Finalizing your report...",
];

export const Loader: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500); // Change message every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="w-16 h-16 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 text-lg font-semibold text-gray-700 dark:text-gray-200">Analyzing Your Resume</p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center transition-opacity duration-500 h-5">
        {loadingMessages[messageIndex]}
      </p>
    </div>
  );
};