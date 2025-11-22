import React, { useState } from 'react';
import { Card } from './Card';
import { optimizeLinkedInProfile } from '../services/geminiService';
import { LinkedInOptimizationResult } from '../types';
import { LinkedinIcon, SparklesIcon, CopyIcon, ClipboardCheckIcon } from './IconComponents';

const ResultLoader: React.FC = () => (
    <div className="space-y-4 animate-pulse pt-4">
        <div className="h-4 bg-gray-600 rounded w-1/4"></div>
        <div className="h-6 bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-600 rounded w-1/4 mt-4"></div>
        <div className="h-20 bg-gray-700 rounded w-full"></div>
    </div>
);

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button onClick={handleCopy} className="bg-gray-700 p-1.5 rounded-md text-gray-300 hover:bg-gray-600 transition-colors">
            {copied ? <ClipboardCheckIcon className="w-5 h-5 text-green-500"/> : <CopyIcon className="w-5 h-5"/>}
        </button>
    );
}

export const LinkedInOptimizerPage: React.FC = () => {
    const [headline, setHeadline] = useState('');
    const [about, setAbout] = useState('');
    const [industry, setIndustry] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<LinkedInOptimizationResult | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!headline || !about || !industry) {
            setError("Please fill out all fields.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const optimizationResult = await optimizeLinkedInProfile(headline, about, industry);
            setResult(optimizationResult);
        } catch (err: any) {
            setError(err.message || "Failed to optimize profile. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><LinkedinIcon className="w-6 h-6 text-purple-400"/> LinkedIn Optimizer</h2>
                    <p className="text-sm text-gray-400">Paste your current headline and about section, specify your target industry, and let AI craft a more compelling version.</p>
                    <div>
                        <label htmlFor="headline" className="block text-sm font-medium text-gray-300">Current Headline</label>
                        <input
                            id="headline"
                            type="text"
                            value={headline}
                            onChange={e => setHeadline(e.target.value)}
                            placeholder="e.g., Software Engineer at Acme Corp"
                            className="w-full mt-1 p-2 bg-black/20 rounded-md border border-white/20 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                    </div>
                     <div>
                        <label htmlFor="about" className="block text-sm font-medium text-gray-300">Current About Section</label>
                        <textarea
                            id="about"
                            value={about}
                            onChange={e => setAbout(e.target.value)}
                            rows={8}
                            placeholder="Paste your 'About' section here..."
                            className="w-full mt-1 p-2 bg-black/20 rounded-md border border-white/20 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-y"
                        />
                    </div>
                     <div>
                        <label htmlFor="industry" className="block text-sm font-medium text-gray-300">Target Industry</label>
                        <input
                            id="industry"
                            type="text"
                            value={industry}
                            onChange={e => setIndustry(e.target.value)}
                            placeholder="e.g., FinTech, HealthTech, SaaS"
                            className="w-full mt-1 p-2 bg-black/20 rounded-md border border-white/20 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                    </div>
                     <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2.5 px-6 rounded-lg disabled:from-gray-500 transition-all transform hover:scale-105">
                        <SparklesIcon className="w-5 h-5" />
                        {isLoading ? 'Optimizing...' : 'Optimize My Profile'}
                    </button>
                    {error && <p className="text-center text-red-400 text-sm mt-2">{error}</p>}
                </form>
            </Card>
            <Card className="p-6">
                <h2 className="text-xl font-bold">AI-Powered Results</h2>
                <div className="mt-4 bg-black/20 p-4 rounded-lg min-h-[400px]">
                    {isLoading && <ResultLoader />}
                    {!isLoading && !result && <p className="text-gray-400 text-center pt-16">Your optimized profile will appear here.</p>}
                    {result && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h3 className="font-semibold text-purple-400 mb-2">Optimized Headline</h3>
                                <div className="flex items-start gap-2">
                                    <p className="text-gray-200 bg-gray-700/50 p-2 rounded-md flex-grow">{result.optimizedHeadline}</p>
                                    <CopyButton textToCopy={result.optimizedHeadline} />
                                </div>
                            </div>
                             <div>
                                <h3 className="font-semibold text-purple-400 mb-2">Optimized About Section</h3>
                                <div className="flex items-start gap-2">
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-700/50 p-2 rounded-md flex-grow">{result.optimizedAbout}</p>
                                     <CopyButton textToCopy={result.optimizedAbout} />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-purple-400 mb-2">Key Improvements</h3>
                                <ul className="list-disc list-inside space-y-2 text-sm text-gray-400">
                                    {result.keyImprovements.map((item, index) => <li key={index}>{item}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
