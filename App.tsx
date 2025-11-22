
import React, { useState } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { ResultsDisplay } from './components/ResultsDisplay';
import { ResumeEditorPage } from './components/ResumeEditorPage';
import { AnalysisResult } from './types';
import { analyzeResume } from './services/geminiService';

type Page = 'upload' | 'results' | 'editor';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('upload');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResumeFile(file);
    setAnalysisResult(null);
    setPage('upload');

    try {
      const result = await analyzeResume(file);
      setAnalysisResult(result);
      setPage('results');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during analysis. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeNew = () => {
    setPage('upload');
    setResumeFile(null);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
  };

  const handleEditResume = () => {
    if (resumeFile && analysisResult) {
      setPage('editor');
    }
  };
  
  const handleBackToResults = () => {
      setPage('results');
  }

  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }
    if (error) {
      return (
        <div className="text-center bg-red-500/10 p-6 rounded-2xl border border-red-500/30">
          <p className="text-red-400 font-semibold">Analysis Failed</p>
          <p className="mt-2 text-sm text-red-300">{error}</p>
          <button onClick={handleAnalyzeNew} className="mt-6 bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors">
            Try Again
          </button>
        </div>
      );
    }

    switch (page) {
      case 'results':
        return analysisResult && resumeFile ? (
          <ResultsDisplay
            analysisResult={analysisResult}
            resumeFile={resumeFile}
            onEditResume={handleEditResume}
            onAnalyzeNew={handleAnalyzeNew}
          />
        ) : null;
      case 'editor':
          return resumeFile && analysisResult ? (
            <ResumeEditorPage 
                resumeFile={resumeFile}
                initialAnalysis={analysisResult}
                onBack={handleBackToResults}
            />
          ) : null;
      case 'upload':
      default:
        return <FileUpload onAnalyze={handleAnalyze} />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-sans selection:bg-purple-500/30">
      <main className="container mx-auto px-4 py-12 md:py-20">
        <Header />
        <div className="mt-12">
          {renderContent()}
        </div>
      </main>
      <footer className="text-center py-6 text-sm text-gray-500">
        <p>Powered by Google Gemini</p>
        <p className="mt-2">© NeuroNova-Team-gen-ai-hackathon</p>
      </footer>
    </div>
  );
};

export default App;