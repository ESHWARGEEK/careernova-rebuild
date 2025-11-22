
import React, { useState, useRef, useEffect } from 'react';
import { JobListing } from '../types';
import { Card } from './Card';
import { BotMessageSquareIcon, LightbulbIcon, BookmarkIcon, ExternalLinkIcon, CheckCircleIcon } from './IconComponents';
import { runJobSearchAgentStream } from '../services/geminiService';
import { JobPrepModal } from './JobPrepModal';
import { TrackJobModal } from './TrackJobModal';

interface AgenticJobSearchPageProps {
    resumeSummary: string;
}

const parseStream = (text: string) => {
    const planMatch = text.match(/<plan>([\s\S]*?)<\/plan>/);
    const logMatch = text.match(/<log>([\s\S]*?)<\/log>/);
    const jobsMatch = text.match(/<jobs>([\s\S]*?)<\/jobs>/);
    return {
        plan: planMatch ? planMatch[1].trim() : null,
        log: logMatch ? logMatch[1].trim() : null,
        jobs: jobsMatch ? jobsMatch[1].trim() : null,
    };
};

export const AgenticJobSearchPage: React.FC<AgenticJobSearchPageProps> = ({ resumeSummary }) => {
    const [mission, setMission] = useState('Find a remote senior product manager role in fintech');
    const [isAgentRunning, setIsAgentRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [plan, setPlan] = useState<string[]>([]);
    const [agentLogs, setAgentLogs] = useState<string[]>([]);
    const [jobListings, setJobListings] = useState<JobListing[]>([]);

    const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
    const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
    const [selectedJobToTrack, setSelectedJobToTrack] = useState<JobListing | null>(null);

    const logsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [agentLogs]);

    const handleStartAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mission) return;

        setIsAgentRunning(true);
        setError(null);
        setPlan([]);
        setAgentLogs([]);
        setJobListings([]);

        try {
            const stream = await runJobSearchAgentStream(mission, resumeSummary);
            let fullResponseText = '';

            for await (const chunk of stream) {
                fullResponseText += chunk.text;
                
                const { plan: planContent, log: logContent, jobs: jobsContent } = parseStream(fullResponseText);
                
                if (planContent) {
                    const planSteps = planContent.split('\n').map(step => step.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
                    setPlan(planSteps);
                }
                if (logContent) {
                   const logs = logContent.split('\n').filter(Boolean);
                   setAgentLogs(logs);
                }
                if (jobsContent) {
                    try {
                        const parsedJobs = JSON.parse(jobsContent);
                        if (parsedJobs.jobs && Array.isArray(parsedJobs.jobs)) {
                            setJobListings(parsedJobs.jobs);
                        }
                    } catch (parseError) {
                        console.warn("Could not parse jobs JSON yet, waiting for more data...");
                    }
                }
            }
        } catch (err: any) {
            console.error("Agentic search failed:", err);
            setError(err.message || "An unexpected error occurred. Please try again.");
        } finally {
            setIsAgentRunning(false);
        }
    };
    
    const handlePrep = (job: JobListing) => {
        setSelectedJob(job);
        setIsPrepModalOpen(true);
    };

    const handleTrack = (job: JobListing) => {
        setSelectedJobToTrack(job);
        setIsTrackModalOpen(true);
    };

    return (
        <div className="animate-fade-in space-y-6">
            <Card className="p-6">
                <form onSubmit={handleStartAgent}>
                    <label htmlFor="mission" className="text-lg font-semibold text-gray-300">Your Mission</label>
                    <p className="text-sm text-gray-400 mt-1 mb-3">Define your goal, and the AI agent will create and execute a plan to achieve it.</p>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <input
                            id="mission"
                            type="text"
                            value={mission}
                            onChange={(e) => setMission(e.target.value)}
                            placeholder="e.g., Find senior backend engineer roles in New York"
                            className="w-full p-2 bg-black/20 rounded-md border border-white/20 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                        <button type="submit" disabled={isAgentRunning} className="w-full sm:w-auto self-end flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2.5 px-6 rounded-lg disabled:from-gray-500 transition-all transform hover:scale-105">
                            <BotMessageSquareIcon className="w-5 h-5" />
                            {isAgentRunning ? 'Agent Running...' : 'Start Agent'}
                        </button>
                    </div>
                </form>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-center">MCP Toolbox</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-purple-400">Mission</h3>
                            <p className="text-sm text-gray-300 bg-black/20 p-2 rounded-md mt-1">{mission || "Not defined"}</p>
                        </div>
                         <div>
                            <h3 className="font-semibold text-purple-400">Capabilities</h3>
                            <p className="text-sm text-gray-300 bg-black/20 p-2 rounded-md mt-1 h-20 overflow-y-auto">{resumeSummary}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-purple-400">Plan</h3>
                            <ul className="text-sm text-gray-300 bg-black/20 p-3 rounded-md mt-1 space-y-2">
                                {isAgentRunning && plan.length === 0 && <li className="text-gray-400 italic">Agent is formulating a plan...</li>}
                                {plan.map((step, i) => (
                                    <li key={i} className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> {step}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 flex flex-col">
                    <h2 className="text-xl font-bold mb-4 text-center">Agent Log</h2>
                    <div ref={logsContainerRef} className="bg-black/30 p-3 rounded-md flex-grow h-64 lg:h-auto overflow-y-auto font-mono text-xs text-gray-300">
                        {agentLogs.length === 0 && <p className="text-gray-500 italic">{isAgentRunning ? "Awaiting agent activity..." : "Start the agent to see its logs."}</p>}
                        {agentLogs.map((log, i) => (
                            <p key={i} className="animate-fade-in">&gt; {log}</p>
                        ))}
                         {isAgentRunning && <div className="w-2.5 h-4 bg-purple-400 animate-pulse mt-1"></div>}
                    </div>
                </Card>
            </div>
            
            {error && <p className="text-center text-red-400">{error}</p>}
            
            {jobListings.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">Agent Results</h2>
                    {jobListings.map((job, index) => (
                        <Card key={index} className="p-5 hover:border-purple-500/50">
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-lg text-purple-300">{job.title}</h3>
                                    <p className="text-sm font-semibold">{job.company} - <span className="text-gray-400 font-normal">{job.location}</span></p>
                                    <p className="text-sm text-gray-300 mt-2">{job.description}</p>
                                </div>
                                <div className="flex sm:flex-col justify-start sm:justify-center items-center gap-2 flex-shrink-0">
                                    <button onClick={() => handleTrack(job)} className="w-full sm:w-auto text-sm flex items-center justify-center gap-2 bg-purple-500/20 text-purple-300 px-3 py-2 rounded-md hover:bg-purple-500/30 transition-colors">
                                        <BookmarkIcon className="w-4 h-4"/> Track
                                    </button>
                                    <button onClick={() => handlePrep(job)} className="w-full sm:w-auto text-sm flex items-center justify-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-2 rounded-md hover:bg-indigo-500/30 transition-colors">
                                        <LightbulbIcon className="w-4 h-4"/> Prep
                                    </button>
                                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto text-sm flex items-center justify-center gap-2 bg-gray-500/20 text-gray-300 px-3 py-2 rounded-md hover:bg-gray-500/30 transition-colors">
                                        <ExternalLinkIcon className="w-4 h-4"/> Apply
                                    </a>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <JobPrepModal isOpen={isPrepModalOpen} onClose={() => setIsPrepModalOpen(false)} job={selectedJob} resumeSummary={resumeSummary} />
            <TrackJobModal isOpen={isTrackModalOpen} onClose={() => setIsTrackModalOpen(false)} job={selectedJobToTrack} />
        </div>
    );
};