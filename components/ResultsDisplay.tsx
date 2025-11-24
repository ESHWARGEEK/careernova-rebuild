import React, { useState } from 'react';
import { AnalysisResult, CareerPath } from '../types';
import { Card } from './Card';
import { RadialProgress } from './RadialProgress';
import { AtsScoreModal } from './AtsScoreModal';
import { RoadmapModal } from './RoadmapModal';
import { InterviewModal } from './InterviewModal';
import { RoadmapResult } from '../types';
import { getCareerRoadmap } from '../services/geminiService';
import { LayoutDashboardIcon, ArrowRightIcon, BrainCircuitIcon, EditIcon, FilePlusIcon, LightbulbIcon, MessageSquareQuoteIcon, SearchIcon, SparklesIcon, TrendingUpIcon, BriefcaseIcon, BotMessageSquareIcon, UsersIcon, MapIcon, LinkedinIcon, VideoIcon, Building2Icon, DollarSignIcon, ActivityIcon } from './IconComponents';
import { AgenticJobSearchPage } from './AgenticJobSearchPage';
import { JobTrackerPage } from './JobTrackerPage';
import { ConnectionsPage } from './ConnectionsPage';
import { CareerTrajectoryPage } from './CareerTrajectoryPage';
import { DashboardPage } from './DashboardPage';
import { LinkedInOptimizerPage } from './LinkedInOptimizerPage';
import { VideoPitchCoachPage } from './VideoPitchCoachPage';
import { CompanyVibePage } from './CompanyVibePage';

interface ResultsDisplayProps {
  analysisResult: AnalysisResult;
  resumeFile: File;
  onEditResume: () => void;
  onAnalyzeNew: () => void;
}

export type ActiveTab = 'dashboard' | 'analysis' | 'jobs' | 'video' | 'tracker' | 'connections' | 'trajectory' | 'linkedin' | 'vibe';

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ analysisResult, resumeFile, onEditResume, onAnalyzeNew }) => {
  const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  
  const [selectedCareerPath, setSelectedCareerPath] = useState<CareerPath | null>(null);
  const [roadmapData, setRoadmapData] = useState<RoadmapResult | null>(null);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const handleViewRoadmap = async (path: CareerPath) => {
    setSelectedCareerPath(path);
    setIsRoadmapModalOpen(true);
    setIsRoadmapLoading(true);
    setRoadmapData(null);
    try {
        const result = await getCareerRoadmap(path, analysisResult.summary);
        setRoadmapData(result);
    } catch (error) {
        console.error("Failed to generate roadmap:", error);
    } finally {
        setIsRoadmapLoading(false);
    }
  };

  const handlePracticeInterview = (path: CareerPath) => {
    setSelectedCareerPath(path);
    setIsInterviewModalOpen(true);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
        case 'dashboard':
            return <DashboardPage analysisResult={analysisResult} onNavigate={setActiveTab} onEditResume={onEditResume} />;
        case 'analysis':
            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <div className="p-6">
                                <h2 className="text-xl font-bold flex items-center gap-2"><SparklesIcon className="w-6 h-6 text-yellow-400" /> AI Summary &amp; Recommendations</h2>
                                <p className="mt-3 text-gray-300">{analysisResult.summary}</p>
                            </div>
                        </Card>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <div className="p-6">
                                    <h3 className="font-semibold text-lg">Strengths</h3>
                                    <ul className="mt-3 space-y-3">
                                    {(analysisResult.strengths || []).map((s, i) => (
                                        <li key={i} className="text-sm">
                                            <p className="font-semibold text-green-400">{s.point}</p>
                                            <p className="text-gray-400 text-xs mt-1">{s.explanation}</p>
                                        </li>
                                    ))}
                                    </ul>
                                </div>
                            </Card>
                            <Card>
                                <div className="p-6">
                                    <h3 className="font-semibold text-lg">Areas for Improvement</h3>
                                    <ul className="mt-3 space-y-3">
                                    {(analysisResult.weaknesses || []).map((w, i) => (
                                        <li key={i} className="text-sm">
                                            <p className="font-semibold text-amber-400">{w.point}</p>
                                            <p className="text-gray-400 text-xs mt-1">{w.explanation}</p>
                                        </li>
                                    ))}
                                    </ul>
                                </div>
                            </Card>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <Card className="p-6 text-center">
                            <h3 className="font-semibold">ATS Score</h3>
                            <div className="my-3 flex justify-center">
                                <RadialProgress score={analysisResult.atsScore} />
                            </div>
                            <button onClick={() => setIsAtsModalOpen(true)} className="text-xs text-purple-400 hover:underline">What is this?</button>
                        </Card>
                        <Card className="p-6">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><TrendingUpIcon className="w-5 h-5" /> Suggested Career Paths</h3>
                            <div className="mt-4 space-y-4">
                                {(analysisResult.suggestedRoles || []).map((path) => (
                                    <div key={path.role} className="bg-black/20 p-4 rounded-lg border border-white/5 hover:border-purple-500/30 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-bold text-lg text-white">{path.role}</p>
                                            <span className="text-xs font-bold px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">{path.matchPercentage}% Match</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-300 bg-black/30 p-1.5 rounded">
                                                <DollarSignIcon className="w-3.5 h-3.5 text-green-400" />
                                                <span>{path.salaryRange || 'N/A'}</span>
                                            </div>
                                             <div className="flex items-center gap-1.5 text-xs text-gray-300 bg-black/30 p-1.5 rounded">
                                                <ActivityIcon className="w-3.5 h-3.5 text-sky-400" />
                                                <span>Demand: {path.marketDemand || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <p className="text-xs text-gray-400 mb-3">{path.reasoning}</p>
                                        
                                        {path.growthOutlook && (
                                            <p className="text-xs text-gray-500 italic mb-3 flex items-center gap-1">
                                                <TrendingUpIcon className="w-3 h-3" /> {path.growthOutlook}
                                            </p>
                                        )}

                                        <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
                                            <button onClick={() => handleViewRoadmap(path)} className="flex-1 text-xs flex items-center justify-center gap-1 bg-indigo-500/10 text-indigo-300 py-2 rounded hover:bg-indigo-500/20 transition-colors font-semibold">
                                                <LightbulbIcon className="w-3 h-3" /> Roadmap
                                            </button>
                                            <button onClick={() => handlePracticeInterview(path)} className="flex-1 text-xs flex items-center justify-center gap-1 bg-sky-500/10 text-sky-300 py-2 rounded hover:bg-sky-500/20 transition-colors font-semibold">
                                                <MessageSquareQuoteIcon className="w-3 h-3"/> Interview
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            );
        case 'jobs':
             return <AgenticJobSearchPage resumeSummary={analysisResult.summary} />;
        case 'video':
            return <VideoPitchCoachPage />;
        case 'vibe':
            return <CompanyVibePage />;
        case 'tracker':
            return <JobTrackerPage />;
        case 'connections':
            return <ConnectionsPage resumeSummary={analysisResult.summary} />;
        case 'trajectory':
            return <CareerTrajectoryPage resumeSummary={analysisResult.summary} />;
        case 'linkedin':
            return <LinkedInOptimizerPage />;
        default:
            return null;
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center justify-center gap-4 flex-wrap">
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
                  <LayoutDashboardIcon className="w-5 h-5" /> Dashboard
              </button>
              <button onClick={() => setActiveTab('analysis')} className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'analysis' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
                  <BrainCircuitIcon className="w-5 h-5" /> Analysis
              </button>
              <button onClick={onEditResume} className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 bg-white/10 hover:bg-white/20`}>
                  <EditIcon className="w-5 h-5" /> Edit Resume
              </button>
               <button onClick={() => setActiveTab('vibe')} className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'vibe' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
                  <Building2Icon className="w-5 h-5" /> Vibe Check
              </button>
               <button onClick={() => setActiveTab('video')} className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'video' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
                  <VideoIcon className="w-5 h-5" /> Video Coach
              </button>
              <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'jobs' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
                  <BotMessageSquareIcon className="w-5 h-5" /> AI Job Agent
              </button>
               <button onClick={() => setActiveTab('linkedin')} className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'linkedin' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
                  <LinkedinIcon className="w-5 h-5" /> LinkedIn
              </button>
              <button onClick={() => setActiveTab('connections')} className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'connections' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
                  <UsersIcon className="w-5 h-5" /> Connections
              </button>
              <button onClick={() => setActiveTab('tracker')} className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'tracker' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
                  <BriefcaseIcon className="w-5 h-5" /> Tracker
              </button>
              <button onClick={() => setActiveTab('trajectory')} className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'trajectory' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}>
                  <MapIcon className="w-5 h-5" /> Trajectory
              </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onAnalyzeNew} className="flex items-center gap-2 text-sm bg-gray-500/10 text-gray-300 px-4 py-2 rounded-md hover:bg-gray-500/20 transition-colors">
              <FilePlusIcon className="w-4 h-4" /> Analyze New
            </button>
          </div>
      </div>
      
      {renderActiveTab()}

      <AtsScoreModal isOpen={isAtsModalOpen} onClose={() => setIsAtsModalOpen(false)} score={analysisResult.atsScore} />
      <RoadmapModal isOpen={isRoadmapModalOpen} onClose={() => setIsRoadmapModalOpen(false)} isLoading={isRoadmapLoading} roadmapData={roadmapData} careerPath={selectedCareerPath} />
      <InterviewModal isOpen={isInterviewModalOpen} onClose={() => setIsInterviewModalOpen(false)} careerPath={selectedCareerPath} resumeSummary={analysisResult.summary} />
    </div>
  );
};