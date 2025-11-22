import React, { useState } from 'react';
import { Card } from './Card';
import { getCareerTrajectory } from '../services/geminiService';
import { CareerTrajectoryResult, TrajectoryStep } from '../types';
import { MapIcon, SearchIcon, BriefcaseIcon, LightbulbIcon, BookOpenIcon, ExternalLinkIcon, CheckCircleIcon } from './IconComponents';

interface CareerTrajectoryPageProps {
    resumeSummary: string;
}

const TrajectoryLoader: React.FC = () => (
    <div className="text-center py-10">
        <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-400">AI is simulating your career trajectory...</p>
    </div>
);

const TrajectoryTimeline: React.FC<{ trajectoryData: CareerTrajectoryResult }> = ({ trajectoryData }) => (
    <div className="space-y-8 mt-6">
        {(trajectoryData.trajectory || []).map((step, index) => (
            <div key={index} className="flex">
                <div className="flex flex-col items-center mr-4">
                    <div>
                        <div className="flex items-center justify-center w-10 h-10 bg-indigo-500 text-white rounded-full ring-4 ring-indigo-900/50">
                            <span className="font-bold">{index + 1}</span>
                        </div>
                    </div>
                    {index < (trajectoryData.trajectory || []).length - 1 && <div className="w-px h-full bg-gray-600"></div>}
                </div>
                <div className="pb-8 w-full">
                    <p className="mb-1 text-xl font-bold text-indigo-400">{step.role}</p>
                    <p className="text-sm font-semibold text-gray-400 mb-4">{step.duration}</p>
                    
                    <div className="space-y-4 bg-black/20 p-4 rounded-lg">
                        <div>
                            <h4 className="flex items-center text-md font-semibold mb-2"><BriefcaseIcon className="w-5 h-5 mr-2 text-green-400"/>Key Responsibilities</h4>
                             <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                                {(step.keyResponsibilities || []).map((resp, i) => <li key={i}>{resp}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="flex items-center text-md font-semibold mb-2"><LightbulbIcon className="w-5 h-5 mr-2 text-amber-400"/>Skills to Acquire</h4>
                            <div className="flex flex-wrap gap-2">
                                {(step.skillsToAcquire || []).map((skill, i) => (
                                    <span key={i} className="px-2 py-1 text-xs font-medium rounded-md bg-amber-900/50 text-amber-300">{skill}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="flex items-center text-md font-semibold mb-2"><BookOpenIcon className="w-5 h-5 mr-2 text-purple-400"/>Suggested Resources</h4>
                            <div className="space-y-2">
                                {(step.suggestedResources || []).map((resource, i) => 
                                 <a href={resource.url} target="_blank" rel="noopener noreferrer" key={i} className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 hover:underline">
                                    {resource.name} <ExternalLinkIcon className="w-3 h-3"/>
                                 </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ))}
         <div className="flex">
                <div className="flex flex-col items-center mr-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-full ring-4 ring-green-900/50">
                        <CheckCircleIcon className="w-6 h-6" />
                    </div>
                </div>
                 <div className="pb-8 w-full pt-2">
                    <p className="text-xl font-bold text-green-400">Dream Job Achieved!</p>
                </div>
            </div>
    </div>
);


export const CareerTrajectoryPage: React.FC<CareerTrajectoryPageProps> = ({ resumeSummary }) => {
    const [dreamJob, setDreamJob] = useState('AI Research Scientist at Google');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trajectory, setTrajectory] = useState<CareerTrajectoryResult | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dreamJob) return;
        setIsLoading(true);
        setError(null);
        setTrajectory(null);
        try {
            const result = await getCareerTrajectory(dreamJob, resumeSummary);
            setTrajectory(result);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to fetch career trajectory.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><MapIcon className="w-6 h-6 text-purple-400"/> Career Trajectory Simulator</h2>
                <p className="text-sm text-gray-400 mb-4">Enter your dream job, and let the AI build a realistic, step-by-step career map to get you there from your current position.</p>
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-center">
                    <input
                        type="text"
                        value={dreamJob}
                        onChange={(e) => setDreamJob(e.target.value)}
                        placeholder="e.g., CTO at a YC startup"
                        className="w-full p-2 bg-black/20 rounded-md border border-white/20 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <button type="submit" disabled={isLoading} className="w-full sm:w-auto self-end flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2.5 px-6 rounded-lg disabled:from-gray-500 transition-all transform hover:scale-105">
                        <SearchIcon className="w-5 h-5" />
                        {isLoading ? 'Simulating...' : 'Simulate Trajectory'}
                    </button>
                </form>
            </Card>

            {isLoading && <TrajectoryLoader />}
            {error && <p className="text-center text-red-400">{error}</p>}
            {trajectory && <TrajectoryTimeline trajectoryData={trajectory} />}
        </div>
    );
};