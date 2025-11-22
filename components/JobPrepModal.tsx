
import React, { useState, useEffect } from 'react';
import { JobListing } from '../types';
import { XCircleIcon, CopyIcon, BrainCircuitIcon, ClipboardCheckIcon } from './IconComponents';
import { ai } from '../services/geminiService';

interface JobPrepModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: JobListing | null;
    resumeSummary: string;
}

type PrepTab = 'coverLetter' | 'questions';

const ContentLoader: React.FC = () => (
    <div className="space-y-4 animate-pulse pt-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
    </div>
);

export const JobPrepModal: React.FC<JobPrepModalProps> = ({ isOpen, onClose, job, resumeSummary }) => {
    const [activeTab, setActiveTab] = useState<PrepTab>('coverLetter');
    const [isLoading, setIsLoading] = useState(false);
    const [content, setContent] = useState('');
    const [copied, setCopied] = useState(false);

    const generateContent = async (tab: PrepTab) => {
        if (!job) return;
        setIsLoading(true);
        setContent('');
        
        let prompt = '';
        if (tab === 'coverLetter') {
            prompt = `Write a professional and concise cover letter for the role of "${job.title}" at "${job.company}". The candidate's background is: "${resumeSummary}". The job description is: "${job.description}". The letter should be tailored to the job and highlight the candidate's relevant skills.`;
        } else {
            prompt = `Generate a list of 5-7 potential interview questions for the role of "${job.title}" at "${job.company}". Include a mix of behavioral, technical, and situational questions based on the job description: "${job.description}". For each question, provide a brief tip on what the interviewer is looking for.`;
        }

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setContent(response.text);
        } catch (error) {
            console.error("Failed to generate content:", error);
            setContent("Sorry, an error occurred while generating content. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && job) {
            generateContent(activeTab);
        } else {
            // Reset state on close
            setActiveTab('coverLetter');
            setContent('');
            setIsLoading(false);
        }
    }, [isOpen, job, activeTab]);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen || !job) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Job Preparation</h2>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{job.title} at {job.company}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close modal">
                        <XCircleIcon className="w-7 h-7" />
                    </button>
                </header>

                <nav className="flex border-b border-gray-200 dark:border-gray-700 px-4">
                    <button onClick={() => setActiveTab('coverLetter')} className={`flex-1 text-center p-3 font-semibold text-sm transition-colors ${activeTab === 'coverLetter' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        Cover Letter
                    </button>
                    <button onClick={() => setActiveTab('questions')} className={`flex-1 text-center p-3 font-semibold text-sm transition-colors ${activeTab === 'questions' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        Interview Questions
                    </button>
                </nav>

                <main className="p-6 overflow-y-auto relative">
                    {isLoading && <ContentLoader />}
                    {!isLoading && (
                        <>
                         <button onClick={handleCopy} className="absolute top-4 right-4 bg-gray-200 dark:bg-gray-700 p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            {copied ? <ClipboardCheckIcon className="w-5 h-5 text-green-500"/> : <CopyIcon className="w-5 h-5"/>}
                         </button>
                         <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                            {content}
                        </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};
