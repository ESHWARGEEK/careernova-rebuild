
import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from './IconComponents';

// Function to get the initial theme from localStorage or system preference
const getInitialTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const storedPrefs = window.localStorage.getItem('theme');
        if (storedPrefs === 'light' || storedPrefs === 'dark') {
            return storedPrefs;
        }
        const userMedia = window.matchMedia('(prefers-color-scheme: dark)');
        if (userMedia.matches) {
            return 'dark';
        }
    }
    // Default to dark theme if no preference found
    return 'dark';
};

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme());

  useEffect(() => {
    const root = window.document.documentElement;
    // Ensure the correct class is set on the html element
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    // Save the theme preference to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-200/20 text-gray-300 transition-colors duration-300 hover:bg-gray-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 dark:bg-gray-700/50 dark:hover:bg-gray-600/60"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <SunIcon
        className={`h-5 w-5 text-yellow-300 transition-transform duration-500 ease-in-out ${
          theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
        }`}
      />
      <MoonIcon
        className={`absolute h-5 w-5 text-indigo-300 transition-transform duration-500 ease-in-out ${
          theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
        }`}
      />
    </button>
  );
};
