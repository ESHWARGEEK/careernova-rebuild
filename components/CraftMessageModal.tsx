import React, { useState, useEffect } from 'react';
import { LinkedInConnection, MessageGoal } from '../types';
import { XCircleIcon, CopyIcon, ClipboardCheckIcon, SendIcon } from './IconComponents';
import { craftNetworkingMessage } from '../services/geminiService';

interface CraftMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    connection: LinkedInConnection | null;
    resumeSummary: string;
}

const GOALS: MessageGoal[] = ['Informational Interview', 'Referral Request', 'General Networking'];

const ModalLoader: React.FC = () => (
    <div className="space-y-4 animate-pulse pt-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
    </div>
);

export const CraftMessageModal: React.FC<CraftMessageModalProps> = ({ isOpen, onClose, connection, resumeSummary }) => {
    const [goal, setGoal] = useState<MessageGoal>('Informational Interview');
    const [jobDetails, setJobDetails] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedMessage, setGeneratedMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setGoal('Informational Interview');
            setJobDetails('');
            setGeneratedMessage('');
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!connection) return;

        setIsLoading(true);
        setGeneratedMessage('');
        setError(null);
        try {
            const message = await craftNetworkingMessage({ ...connection, company: 'the company'}, goal, resumeSummary, jobDetails);
            setGeneratedMessage(message);
        } catch (err: any) {
            console.error("Failed to craft message:", err);
            setError(err.message || "Could not generate message. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = () => {
        if (!generatedMessage) return;
        const fullMessage = `Hi ${connection?.name.split(' ')[0]},\n\n${generatedMessage}\n\nBest regards,\n[Your Name]`;
        navigator.clipboard.writeText(fullMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen || !connection) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Craft Networking Message</h2>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">To: {connection.name} ({connection.title})</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close modal">
                        <XCircleIcon className="w-7 h-7" />
                    </button>
                </header>

                <main className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What is your goal?</label>
                        <div className="flex flex-wrap gap-2">
                            {GOALS.map(g => (
                                <button
                                    key={g}
                                    onClick={() => setGoal(g)}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${goal === g ? 'bg-purple-600 text-white font-semibold' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    {goal === 'Referral Request' && (
                        <div className="animate-fade-in">
                            <label htmlFor="jobDetails" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Title or URL</label>
                            <input
                                id="jobDetails"
                                type="text"
                                value={jobDetails}
                                onChange={(e) => setJobDetails(e.target.value)}
                                placeholder="e.g., Senior Software Engineer"
                                className="mt-1 w-full p-2 bg-white dark:bg-gray-900/50 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                        </div>
                    )}
                    
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || (goal === 'Referral Request' && !jobDetails)}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2.5 px-6 rounded-lg disabled:from-gray-500 transition-all transform hover:scale-105 disabled:cursor-not-allowed"
                    >
                        <SendIcon className="w-5 h-5" />
                        {isLoading ? 'Generating...' : 'Generate Message'}
                    </button>

                    {(isLoading || generatedMessage || error) && (
                        <div className="mt-4 p-4 bg-black/20 rounded-md min-h-[150px] relative">
                             {isLoading && <ModalLoader />}
                             {error && <p className="text-red-400">{error}</p>}
                             {generatedMessage && (
                                <>
                                    <p className="text-xs text-gray-400 mb-2">Hi {connection.name.split(' ')[0]},</p>
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{generatedMessage}</p>
                                    <p className="text-xs text-gray-400 mt-2">Best regards,<br/>[Your Name]</p>
                                    <button onClick={handleCopy} className="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                        {copied ? <ClipboardCheckIcon className="w-5 h-5 text-green-500"/> : <CopyIcon className="w-5 h-5"/>}
                                    </button>
                                </>
                             )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};