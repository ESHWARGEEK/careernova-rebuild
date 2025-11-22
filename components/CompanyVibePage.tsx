import React, { useState } from 'react';
import { Card } from './Card';
import { getCompanyVibeAnalysis } from '../services/geminiService';
import { UserVibeProfile, CompanyVibeAnalysisResult, GroundingChunk } from '../types';
import { Building2Icon, SearchIcon, SparklesIcon, ExternalLinkIcon } from './IconComponents';
import { RadialProgress } from './RadialProgress';

type VibeQuestion = keyof UserVibeProfile;
type Stage = 'questions' | 'company_input' | 'loading' | 'results' | 'error';

const VIBE_QUESTIONS: Record<VibeQuestion, { question: string; options: [string, string] }> = {
    pace: {
        question: "What's your ideal work pace?",
        options: ["Fast-paced & Dynamic", "Steady & Predictable"],
    },
    collaboration: {
        question: "How do you prefer to work?",
        options: ["Highly Collaborative", "Independent & Focused"],
    },
    structure: {
        question: "What kind of company structure do you thrive in?",
        options: ["Structured & Hierarchical", "Flat & Autonomous"],
    },
    feedback: {
        question: "How do you like to receive feedback?",
        options: ["Direct & Frequent", "Indirect & Formal"],
    },
};

export const CompanyVibePage: React.FC = () => {
    const [stage, setStage] = useState<Stage>('questions');
    const [userVibe, setUserVibe] = useState<Partial<UserVibeProfile>>({});
    const [companyName, setCompanyName] = useState('Netflix');
    const [analysis, setAnalysis] = useState<CompanyVibeAnalysisResult | null>(null);
    const [sources, setSources] = useState<GroundingChunk[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleAnswer = (question: VibeQuestion, answer: string) => {
        const newUserVibe = { ...userVibe, [question]: answer };
        setUserVibe(newUserVibe);
        if (Object.keys(newUserVibe).length === Object.keys(VIBE_QUESTIONS).length) {
            setStage('company_input');
        }
    };

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyName) return;

        setStage('loading');
        setError(null);
        setAnalysis(null);
        setSources([]);

        try {
            const result = await getCompanyVibeAnalysis(companyName, userVibe as UserVibeProfile);
            setAnalysis(result.analysis);
            setSources(result.groundingMetadata?.groundingChunks || []);
            setStage('results');
        } catch (err: any) {
            console.error("Vibe analysis failed:", err);
            setError(err.message || "Failed to analyze company vibe.");
            setStage('error');
        }
    };
    
    const renderContent = () => {
        switch(stage) {
            case 'questions':
                return (
                    <Card className="p-6 max-w-2xl mx-auto">
                        <h2 className="text-xl font-bold mb-2 text-center">Let's find your vibe!</h2>
                        <p className="text-sm text-gray-400 mb-6 text-center">Answer a few questions to help us understand your ideal work environment.</p>
                        <div className="space-y-6">
                            {Object.entries(VIBE_QUESTIONS).map(([key, { question, options }]) => (
                                <div key={key}>
                                    <h3 className="font-semibold text-gray-300">{question}</h3>
                                    <div className="flex gap-4 mt-2">
                                        {options.map(option => (
                                            <button 
                                                key={option} 
                                                onClick={() => handleAnswer(key as VibeQuestion, option)}
                                                className={`flex-1 p-3 text-sm rounded-lg transition-all transform hover:scale-105 ${userVibe[key as VibeQuestion] === option ? 'bg-purple-600 text-white font-bold ring-2 ring-purple-400' : 'bg-black/20 hover:bg-black/40'}`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                );

            case 'company_input':
                return (
                     <Card className="p-6 max-w-2xl mx-auto text-center">
                        <h2 className="text-xl font-bold mb-2">Great! Your vibe profile is set.</h2>
                        <p className="text-sm text-gray-400 mb-6">Now, enter a company name to analyze its culture and see if it's a good fit for you.</p>
                         <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-4 items-center">
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="e.g., Google, Stripe, etc."
                                className="w-full p-2 bg-black/20 rounded-md border border-white/20 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                            <button type="submit" className="w-full sm:w-auto self-end flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2.5 px-6 rounded-lg transition-all transform hover:scale-105">
                                <SearchIcon className="w-5 h-5" />
                                Analyze Vibe
                            </button>
                        </form>
                    </Card>
                );
            
            case 'loading':
                 return (
                    <div className="text-center py-10">
                        <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="mt-4 text-gray-400">AI is analyzing {companyName}'s vibe...</p>
                        <p className="text-sm text-gray-500">This involves real-time web searches and may take a moment.</p>
                    </div>
                );

            case 'results':
                if (!analysis) return null;
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Vibe Analysis for: <span className="text-purple-400">{companyName}</span></h2>
                             <button onClick={() => setStage('company_input')} className="bg-indigo-500/20 text-indigo-300 font-bold py-2 px-4 rounded-lg transition-colors hover:bg-indigo-500/30">
                                Analyze Another
                            </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                             <div className="lg:col-span-1 flex flex-col gap-6">
                                <Card className="p-6 text-center">
                                    <h3 className="font-semibold">Vibe Fit Score</h3>
                                    <div className="my-3 flex justify-center">
                                        <RadialProgress score={analysis.vibeFitScore} />
                                    </div>
                                </Card>
                                <Card className="p-6">
                                    <h3 className="font-bold mb-3 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-yellow-400"/>Vibe Summary</h3>
                                    <p className="text-sm text-gray-300">{analysis.vibeSummary}</p>
                                </Card>
                             </div>
                             <div className="lg:col-span-2 space-y-6">
                                <Card className="p-6">
                                    <h3 className="font-bold mb-3">Company Vibe Profile</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Pace:</strong> <span className="text-gray-300">{analysis.companyVibe.pace}</span></p>
                                        <p><strong>Collaboration:</strong> <span className="text-gray-300">{analysis.companyVibe.collaboration}</span></p>
                                        <p><strong>Structure:</strong> <span className="text-gray-300">{analysis.companyVibe.structure}</span></p>
                                        <p><strong>Work/Life Balance:</strong> <span className="text-gray-300">{analysis.companyVibe.workLifeBalance}</span></p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {analysis.companyVibe.keywords.map(kw => <span key={kw} className="px-2 py-1 text-xs font-medium rounded-md bg-sky-900/50 text-sky-300">{kw}</span>)}
                                    </div>
                                </Card>
                                 <Card className="p-6">
                                    <h3 className="font-bold mb-3">Match Reasoning</h3>
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{analysis.matchReasoning}</p>
                                </Card>
                                {sources.length > 0 && (
                                     <Card className="p-6">
                                        <h3 className="font-bold mb-3">Sources</h3>
                                        <ul className="space-y-2">
                                            {sources.map((source, index) => source.web && (
                                                <li key={index}>
                                                    <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 hover:underline flex items-center gap-2">
                                                        {source.web.title || source.web.uri}
                                                        <ExternalLinkIcon className="w-3 h-3 flex-shrink-0" />
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </Card>
                                )}
                             </div>
                        </div>
                    </div>
                );
            case 'error':
                 return (
                     <div className="text-center bg-red-500/10 p-6 rounded-2xl border border-red-500/30 max-w-md mx-auto">
                        <p className="text-red-400 font-semibold">Analysis Failed</p>
                        <p className="mt-2 text-sm text-red-300">{error}</p>
                        <button onClick={() => setStage('company_input')} className="mt-6 bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors">
                            Try Again
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="animate-fade-in">
             <header className="mb-6">
                <h1 className="text-3xl font-bold text-center flex items-center justify-center gap-3"><Building2Icon className="w-8 h-8"/> Company Vibe Analyst</h1>
             </header>
            {renderContent()}
        </div>
    );
};
