
import React, { useState, useEffect } from 'react';
import { JobListing, JobFitAnalysisResult } from '../types';
import { XCircleIcon, SparklesIcon, LightbulbIcon, CheckCircleIcon, TrendingUpIcon } from './IconComponents';
import { getJobFitAnalysis, getTextFromFile } from '../services/geminiService';
import { Card } from './Card';
import { RadialProgress } from './RadialProgress';

interface JobFitAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: JobListing | null;
    resumeFile: File | null;
}

const ModalLoader: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Analyzing your resume against the job...</p>
        <p className="mt-1 text-sm text-gray-500">This may take a moment.</p>
    </div>
);

export const JobFitAnalysisModal: React.FC<JobFitAnalysisModalProps> = ({ isOpen, onClose, job, resumeFile }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<JobFitAnalysisResult | null>(null);

    useEffect(() => {
        const analyze = async () => {
            if (!job || !resumeFile) return;

            setIsLoading(true);
            setError(null);
            setAnalysisResult(null);

            try {
                const resumeText = await getTextFromFile(resumeFile);
                if (!resumeText) {
                    throw new Error("Could not extract text from your resume.");
                }
                const result = await getJobFitAnalysis(resumeText, job.description);
                setAnalysisResult(result);
            } catch (err: any) {
                console.error("Job fit analysis failed:", err);
                setError(err.message || "An unexpected error occurred during analysis.");
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen) {
            analyze();
        }
    }, [isOpen, job, resumeFile]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Job Fit Analysis</h2>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{job?.title} at {job?.company}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close modal">
                        <XCircleIcon className="w-7 h-7" />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto">
                    {isLoading && <ModalLoader />}
                    {error && <p className="text-center text-red-400">{error}</p>}
                    {analysisResult && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 flex flex-col gap-6">
                                <Card className="p-6 text-center">
                                    <h3 className="font-semibold">Job Fit Score</h3>
                                    <div className="my-3 flex justify-center">
                                        <RadialProgress score={analysisResult.fitScore} />
                                    </div>
                                </Card>
                                <Card className="p-6">
                                    <h3 className="font-bold mb-3 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-yellow-400"/>Overall Verdict</h3>
                                    <p className="text-sm text-gray-300">{analysisResult.overallVerdict}</p>
                                </Card>
                            </div>
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="p-6">
                                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-green-400"/>Matching Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {analysisResult.matchingSkills.map(skill => <span key={skill} className="px-2 py-1 text-xs font-medium rounded-md bg-green-900/50 text-green-300">{skill}</span>)}
                                    </div>
                                </Card>
                                <Card className="p-6">
                                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><LightbulbIcon className="w-5 h-5 text-amber-400"/>Skill Gaps</h3>
                                    <ul className="space-y-3">
                                        {analysisResult.skillGaps.map(gap => (
                                            <li key={gap.skill} className="text-sm">
                                                <p className="font-semibold text-amber-300">{gap.skill}</p>
                                                <p className="text-xs text-gray-400 mt-1">{gap.reason}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                                <Card className="p-6">
                                     <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><TrendingUpIcon className="w-5 h-5 text-sky-400"/>Actionable Steps to Improve</h3>
                                      <ul className="space-y-3">
                                        {analysisResult.actionableSteps.map(step => (
                                            <li key={step.skillGap}>
                                                <p className="font-semibold text-sm text-sky-300">For {step.skillGap}:</p>
                                                <p className="text-xs text-gray-400 mt-1">{step.suggestion}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
