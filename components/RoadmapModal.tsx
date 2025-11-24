
import React from 'react';
import { RoadmapResult, CareerPath } from '../types';
import { XCircleIcon, LightbulbIcon, BriefcaseIcon, BookOpenIcon, CheckCircleIcon, BrainCircuitIcon } from './IconComponents';

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  roadmapData: RoadmapResult | null;
  careerPath: CareerPath | null;
}

const RoadmapLoader: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Crafting your personalized roadmap...</p>
    </div>
);

const RoadmapTimeline: React.FC<{ roadmapData: RoadmapResult }> = ({ roadmapData }) => (
    <div className="space-y-8">
        {(roadmapData.roadmap || []).map((step, index) => (
            <div key={index} className="flex">
                <div className="flex flex-col items-center mr-4">
                    <div>
                        <div className="flex items-center justify-center w-10 h-10 bg-indigo-500 text-white rounded-full ring-4 ring-indigo-100 dark:ring-indigo-900/50">
                            <CheckCircleIcon className="w-6 h-6" />
                        </div>
                    </div>
                    {index < (roadmapData.roadmap || []).length - 1 && <div className="w-px h-full bg-gray-300 dark:bg-gray-600"></div>}
                </div>
                <div className="pb-8 w-full">
                    <p className="mb-2 text-lg font-bold text-indigo-600 dark:text-indigo-400">{step.stage}</p>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">{step.description}</p>
                    
                    <div className="space-y-4">
                        <div className="bg-purple-50/50 dark:bg-purple-900/10 p-4 rounded-lg border border-purple-100 dark:border-purple-900/30">
                            <h4 className="flex items-center text-md font-bold mb-3 text-purple-700 dark:text-purple-300">
                                <BrainCircuitIcon className="w-5 h-5 mr-2" />
                                Skills to Master
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {(step.skillsToLearn || []).map((skill, i) => (
                                    <span key={i} className="px-3 py-1 text-xs font-semibold rounded-full bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                         <div>
                            <h4 className="flex items-center text-md font-semibold mb-2"><BriefcaseIcon className="w-5 h-5 mr-2 text-green-500"/>Project Ideas</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                {(step.projectIdeas || []).map((project, i) => <li key={i}>{project}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="flex items-center text-md font-semibold mb-2"><BookOpenIcon className="w-5 h-5 mr-2 text-sky-500"/>Resources</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                {(step.resources || []).map((resource, i) => <li key={i}>{resource}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);


export const RoadmapModal: React.FC<RoadmapModalProps> = ({ isOpen, onClose, isLoading, roadmapData, careerPath }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roadmap-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div>
                <h2 id="roadmap-title" className="text-xl font-bold text-gray-800 dark:text-white">Career Roadmap</h2>
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{careerPath?.role}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close modal">
                <XCircleIcon className="w-7 h-7" />
            </button>
        </header>
        
        <main className="p-6 overflow-y-auto">
            {isLoading && <RoadmapLoader />}
            {!isLoading && roadmapData && <RoadmapTimeline roadmapData={roadmapData} />}
            {!isLoading && !roadmapData && <p className="text-center text-gray-500 dark:text-gray-400">Could not generate a roadmap. Please try again.</p>}
        </main>
      </div>
    </div>
  );
};
