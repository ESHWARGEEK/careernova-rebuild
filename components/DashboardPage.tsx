import React, { useState, useEffect } from 'react';
import { AnalysisResult, SuggestedNextStep, TrackedJob } from '../types';
import { ActiveTab } from './ResultsDisplay';
import { Card } from './Card';
import { RadialProgress } from './RadialProgress';
import { getSuggestedNextSteps } from '../services/geminiService';
import { ArrowRightIcon, BrainCircuitIcon, BriefcaseIcon, EditIcon, LightbulbIcon, LinkedinIcon, SearchIcon, VideoIcon, UsersIcon, MapIcon, BotMessageSquareIcon, Building2Icon } from './IconComponents';

interface DashboardPageProps {
    analysisResult: AnalysisResult;
    onNavigate: (tab: ActiveTab) => void;
    onEditResume: () => void;
}

const QuickActionCard: React.FC<{
    icon: React.ElementType;
    title: string;
    description: string;
    onClick: () => void;
}> = ({ icon: Icon, title, description, onClick }) => (
    <Card
        onClick={onClick}
        className="p-6 flex flex-col items-center text-center cursor-pointer group"
    >
        <div className="p-3 bg-purple-500/10 rounded-full group-hover:bg-purple-500/20 transition-colors">
            <Icon className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="mt-4 font-bold text-lg">{title}</h3>
        <p className="mt-1 text-sm text-gray-400">{description}</p>
    </Card>
);

export const DashboardPage: React.FC<DashboardPageProps> = ({ analysisResult, onNavigate, onEditResume }) => {
    const [trackedJobsCount, setTrackedJobsCount] = useState(0);
    const [nextSteps, setNextSteps] = useState<SuggestedNextStep[]>([]);
    const [isLoadingSteps, setIsLoadingSteps] = useState(true);

    useEffect(() => {
        // Load tracked jobs count from localStorage
        try {
            const storedJobs = localStorage.getItem('trackedJobs');
            if (storedJobs) {
                const jobs: TrackedJob[] = JSON.parse(storedJobs);
                setTrackedJobsCount(jobs.length);
            }
        } catch (e) {
            console.error("Failed to read tracked jobs from localStorage", e);
        }

        // Fetch suggested next steps
        const fetchSteps = async () => {
            setIsLoadingSteps(true);
            try {
                const result = await getSuggestedNextSteps(analysisResult);
                setNextSteps(result.steps);
            } catch (e) {
                console.error("Failed to get next steps", e);
                // Set a default step on error
                setNextSteps([{ suggestion: "Explore your suggested career paths.", targetTab: 'analysis' }]);
            } finally {
                setIsLoadingSteps(false);
            }
        };

        fetchSteps();

    }, [analysisResult]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="p-6">
                    <h2 className="text-2xl font-bold">Welcome Back!</h2>
                    <p className="mt-2 text-gray-300">{analysisResult.summary}</p>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <QuickActionCard 
                        icon={BrainCircuitIcon}
                        title="Full Analysis"
                        description="Dive deep into your strengths and weaknesses."
                        onClick={() => onNavigate('analysis')}
                    />
                     <QuickActionCard 
                        icon={BotMessageSquareIcon}
                        title="AI Job Agent"
                        description="Deploy an AI agent to find jobs for you."
                        onClick={() => onNavigate('jobs')}
                    />
                    <QuickActionCard 
                        icon={Building2Icon}
                        title="Company Vibe"
                        description="Check your cultural fit with any company."
                        onClick={() => onNavigate('vibe')}
                    />
                     <QuickActionCard 
                        icon={VideoIcon}
                        title="Video Coach"
                        description="Practice your pitch and get instant AI feedback."
                        onClick={() => onNavigate('video')}
                    />
                     <QuickActionCard 
                        icon={EditIcon}
                        title="Edit Resume"
                        description="Refine your resume with AI suggestions."
                        onClick={onEditResume}
                    />
                    <QuickActionCard 
                        icon={BriefcaseIcon}
                        title="Track Apps"
                        description="Manage your job applications in one place."
                        onClick={() => onNavigate('tracker')}
                    />
                     <QuickActionCard 
                        icon={UsersIcon}
                        title="Find Connections"
                        description="Discover contacts at target companies."
                        onClick={() => onNavigate('connections')}
                    />
                     <QuickActionCard 
                        icon={MapIcon}
                        title="Career Trajectory"
                        description="Simulate your path to your dream job."
                        onClick={() => onNavigate('trajectory')}
                    />
                     <QuickActionCard 
                        icon={LinkedinIcon}
                        title="Optimize LinkedIn"
                        description="Improve your profile with AI-powered tips."
                        onClick={() => onNavigate('linkedin')}
                    />
                </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
                 <Card className="p-6 text-center">
                    <h3 className="font-semibold">Your ATS Score</h3>
                    <div className="my-3 flex justify-center">
                        <RadialProgress score={analysisResult.atsScore} />
                    </div>
                    <p className="text-xs text-gray-400">
                        You are tracking <span className="font-bold text-purple-400">{trackedJobsCount}</span> job(s).
                    </p>
                </Card>
                <Card className="p-6">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <LightbulbIcon className="w-5 h-5 text-yellow-400" />
                        Suggested Next Steps
                    </h3>
                    <div className="mt-4 space-y-3">
                        {isLoadingSteps ? (
                            <div className="text-sm text-gray-400">AI is generating your next steps...</div>
                        ) : (
                            nextSteps.map((step, index) => (
                                <div
                                    key={index}
                                    // FIX: Handle 'editor' as a special case to call onEditResume, which changes the page. Other targetTabs are handled by onNavigate.
                                    onClick={() => {
                                        if (step.targetTab === 'editor') {
                                            onEditResume();
                                        } else {
                                            onNavigate(step.targetTab);
                                        }
                                    }}
                                    className="bg-black/20 p-3 rounded-lg cursor-pointer hover:bg-black/40 transition-colors"
                                >
                                    <p className="text-sm text-gray-300 flex justify-between items-center">
                                        {step.suggestion}
                                        <ArrowRightIcon className="w-4 h-4 text-purple-400 flex-shrink-0 ml-2" />
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};
