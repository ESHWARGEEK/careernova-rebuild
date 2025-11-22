
import React from 'react';
import { XCircleIcon } from './IconComponents';

interface AtsScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
}

const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-purple-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
}

export const AtsScoreModal: React.FC<AtsScoreModalProps> = ({ isOpen, onClose, score }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ats-score-title"
    >
      <div 
        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-lg shadow-xl w-full max-w-md m-4 p-6 relative animate-fade-in-up border border-white/20 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close modal">
          <XCircleIcon className="w-6 h-6" />
        </button>
        
        <h2 id="ats-score-title" className="text-xl font-bold text-gray-800 dark:text-white">What is an ATS Score?</h2>
        
        <div className="my-6 text-center">
            <div className={`text-6xl font-bold ${getScoreColor(score)}`}>{score}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">out of 100</p>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3">
            <p>
                An <strong>Applicant Tracking System (ATS)</strong> is software used by recruiters and employers to manage job applications. Your ATS score is an estimate of how well your resume is optimized to be read and ranked by these systems.
            </p>
            <p>
                A higher score means your resume is likely well-structured, contains relevant keywords for your target roles, and is easy for both software and recruiters to understand.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong>90-100:</strong> Excellent</li>
                <li><strong>75-89:</strong> Good</li>
                <li><strong>50-74:</strong> Average, needs improvement</li>
                <li><strong>Below 50:</strong> Poor, requires significant revision</li>
            </ul>
        </div>

        <button 
            onClick={onClose}
            className="mt-6 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:shadow-lg hover:opacity-90 transition-all duration-200"
        >
            Got it
        </button>
      </div>
    </div>
  );
};
