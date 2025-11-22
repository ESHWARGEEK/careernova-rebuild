import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center relative">
      <h1 
        className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-sky-400"
        style={{ textShadow: '0 0 25px rgba(132, 144, 255, 0.4)' }}
      >
        CareerNova
      </h1>
      <p className="mt-2 text-xl md:text-2xl font-medium text-gray-400">
        AI career advisor
      </p>
      <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
        Unlock your career potential. Upload your resume for an AI-powered analysis and personalized roadmap to success.
      </p>
    </header>
  );
};