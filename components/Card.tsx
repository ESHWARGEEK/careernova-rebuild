import React, { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      {...props}
      className={`bg-black/20 backdrop-blur-2xl rounded-xl shadow-lg shadow-black/20 overflow-hidden border border-white/10 hover:shadow-2xl hover:border-white/20 transition-[transform,box-shadow,border-color] duration-300 ease-in-out transform hover:-translate-y-1 ${className}`}
    >
      {children}
    </div>
  );
};