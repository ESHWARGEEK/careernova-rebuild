
import React, { useState } from 'react';
import { LinkedInConnection } from '../types';
import { Card } from './Card';
import { UsersIcon, SearchIcon, ExternalLinkIcon, UserIcon, SendIcon } from './IconComponents';
import { findLinkedInConnections } from '../services/geminiService';
import { CraftMessageModal } from './CraftMessageModal';

interface ConnectionsPageProps {
    resumeSummary: string;
}

export const ConnectionsPage: React.FC<ConnectionsPageProps> = ({ resumeSummary }) => {
    const [company, setCompany] = useState('Google');
    const [role, setRole] = useState('Software Engineer');
    const [connections, setConnections] = useState<LinkedInConnection[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const [isCraftMessageModalOpen, setIsCraftMessageModalOpen] = useState(false);
    const [selectedConnection, setSelectedConnection] = useState<LinkedInConnection | null>(null);


    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSearched(true);
        setConnections([]);
        try {
            const result = await findLinkedInConnections(company, role);
            setConnections(result.connections || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to find connections. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCraftMessage = (connection: LinkedInConnection) => {
        setSelectedConnection(connection);
        setIsCraftMessageModalOpen(true);
    };

    return (
        <div className="animate-fade-in space-y-6">
            <Card className="p-6">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-grow w-full">
                        <label htmlFor="company" className="text-xs text-gray-400">Company</label>
                        <input
                            id="company"
                            type="text"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="e.g., Google"
                            className="w-full mt-1 p-2 bg-black/20 rounded-md border border-white/20 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex-grow w-full">
                        <label htmlFor="role" className="text-xs text-gray-400">Job Role</label>
                        <input
                            id="role"
                            type="text"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="e.g., Product Manager"
                            className="w-full mt-1 p-2 bg-black/20 rounded-md border border-white/20 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full sm:w-auto self-end flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2.5 px-6 rounded-lg disabled:from-gray-500 transition-all transform hover:scale-105">
                        <SearchIcon className="w-5 h-5" />
                        {isLoading ? 'Searching...' : 'Find Connections'}
                    </button>
                </form>
            </Card>

            {isLoading && (
                <div className="text-center py-10">
                    <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-400">AI agent is searching for connections...</p>
                </div>
            )}
            
            {!isLoading && error && (
                 <Card className="p-6 text-center text-red-400 border-red-500/30">
                    <p className="font-semibold">Search Failed</p>
                    <p className="mt-1 text-sm">{error}</p>
                 </Card>
            )}

            {!isLoading && !error && searched && connections.length === 0 && (
                <Card className="p-10 text-center">
                    <UsersIcon className="w-12 h-12 mx-auto text-gray-500" />
                    <h2 className="mt-4 text-xl font-semibold">No Connections Found</h2>
                    <p className="mt-2 text-gray-400">The AI agent could not find any connections for this search. Try different or broader terms.</p>
                </Card>
            )}
            
            {!isLoading && connections.length > 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {connections.map((person, index) => (
                        <Card key={index} className="p-5 hover:border-purple-500/50 flex flex-col justify-between">
                           <div className="flex items-start gap-4">
                               <div className="flex-shrink-0 p-2 rounded-full bg-black/20 mt-1">
                                    <UserIcon className="w-6 h-6 text-gray-400"/>
                               </div>
                               <div>
                                    <h3 className="font-bold text-lg text-purple-300">{person.name}</h3>
                                    <p className="text-sm text-gray-300">{person.title}</p>
                               </div>
                           </div>
                            <div className="flex items-center gap-2 mt-4">
                                <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm w-full flex items-center justify-center gap-2 bg-sky-500/20 text-sky-300 px-3 py-2 rounded-md hover:bg-sky-500/30 transition-colors">
                                    Find on LinkedIn <ExternalLinkIcon className="w-4 h-4"/>
                                </a>
                                <button 
                                    onClick={() => handleCraftMessage(person)}
                                    className="text-sm w-full flex items-center justify-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-2 rounded-md hover:bg-indigo-500/30 transition-colors"
                                >
                                    Craft Message <SendIcon className="w-4 h-4"/>
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {!searched && !isLoading && (
                 <Card className="p-10 text-center">
                    <UsersIcon className="w-12 h-12 mx-auto text-gray-500" />
                    <h2 className="mt-4 text-xl font-semibold">Find Professional Connections</h2>
                    <p className="mt-2 text-gray-400">Enter a company and job role to let the AI agent find potential contacts for you on LinkedIn.</p>
                </Card>
            )}
            <CraftMessageModal
                isOpen={isCraftMessageModalOpen}
                onClose={() => setIsCraftMessageModalOpen(false)}
                connection={selectedConnection}
                resumeSummary={resumeSummary}
            />
        </div>
    );
};