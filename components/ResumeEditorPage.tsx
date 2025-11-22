
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AnalysisResult, Suggestion, StructuredResume } from '../types';
import { getResumeSuggestions, getUpdatedAtsScore, structureResumeForPdf, getTextFromFile } from '../services/geminiService';
import { Card } from './Card';
import { RadialProgress } from './RadialProgress';
import { ArrowLeftIcon, MagicWandIcon, DownloadIcon, RefreshCwIcon, ArrowRightIcon } from './IconComponents';
import { Loader } from './Loader';

interface ResumeEditorPageProps {
  resumeFile: File;
  initialAnalysis: AnalysisResult;
  onBack: () => void;
}

export const ResumeEditorPage: React.FC<ResumeEditorPageProps> = ({ resumeFile, initialAnalysis, onBack }) => {
    const [resumeText, setResumeText] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentAtsScore, setCurrentAtsScore] = useState(initialAnalysis.atsScore);
    const [isUpdatingScore, setIsUpdatingScore] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        const loadResume = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Use client-side text extraction instead of calling Gemini API
                const text = await getTextFromFile(resumeFile);

                if (!text) {
                    throw new Error("Could not extract text from the resume file. It might be empty or in an unreadable format.");
                }

                setResumeText(text);

                // Fetch initial suggestions for the extracted text
                const suggestionsResult = await getResumeSuggestions(text);
                setSuggestions(suggestionsResult.suggestions || []);

            } catch (err: any) {
                console.error("Failed to load resume for editing:", err);
                setError(err.message || "Could not load resume for editing. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        loadResume();
    }, [resumeFile]);

    const handleUpdateScore = useCallback(async () => {
        if (isUpdatingScore) return;
        setIsUpdatingScore(true);
        try {
            const result = await getUpdatedAtsScore(resumeText);
            setCurrentAtsScore(result.atsScore);
        } catch (err) {
            console.error("Failed to update score:", err);
            // Optionally show an error to the user via a toast or message
        } finally {
            setIsUpdatingScore(false);
        }
    }, [resumeText, isUpdatingScore]);

    const applySuggestion = (suggestion: Suggestion) => {
        setResumeText(currentText => currentText.replace(suggestion.originalText, suggestion.suggestedChange));
        setSuggestions(currentSuggestions => currentSuggestions.filter(s => s.originalText !== suggestion.originalText));
    };

    const handleDownload = () => {
        const blob = new Blob([resumeText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const originalName = resumeFile.name.split('.').slice(0, -1).join('.') || 'resume';
        link.download = `${originalName}_improved.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const structuredData = await structureResumeForPdf(resumeText);
            
            const printableElement = document.getElementById('printable-resume');
            if (!printableElement) {
                throw new Error("Printable container not found.");
            }

            const PrintableResume = ({ data }: { data: StructuredResume }) => (
                <div className="p-8 font-sans text-sm text-gray-800 bg-white">
                    <div className="text-center border-b pb-4 mb-6">
                        <h1 className="text-3xl font-bold">{data.name}</h1>
                        <p className="text-xs mt-2">
                            {data.email} | {data.phone} {data.linkedin && `| ${data.linkedin}`}
                        </p>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold border-b pb-1 mb-2">Summary</h2>
                        <p className="text-xs leading-relaxed">{data.summary}</p>
                    </div>
                    <div className="mt-6">
                        <h2 className="text-lg font-bold border-b pb-1 mb-2">Experience</h2>
                        {(data.experience || []).map((exp, i) => (
                            <div key={i} className="mb-4 break-inside-avoid">
                                <div className="flex justify-between items-baseline">
                                    <h3 className="font-semibold">{exp.role}</h3>
                                    <p className="text-xs font-medium">{exp.dates}</p>
                                </div>
                                <p className="text-xs font-medium">{exp.company}</p>
                                <ul className="list-disc list-inside mt-1 space-y-1 pl-2">
                                    {(exp.description || []).map((desc, j) => (
                                        <li key={j} className="text-xs">{desc}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6">
                        <h2 className="text-lg font-bold border-b pb-1 mb-2">Education</h2>
                        {(data.education || []).map((edu, i) => (
                            <div key={i} className="flex justify-between items-baseline">
                                <div>
                                    <h3 className="font-semibold">{edu.institution}</h3>
                                    <p className="text-xs">{edu.degree}</p>
                                </div>
                                <p className="text-xs font-medium">{edu.dates}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6">
                        <h2 className="text-lg font-bold border-b pb-1 mb-2">Skills</h2>
                        <p className="text-xs">{(data.skills || []).join(', ')}</p>
                    </div>
                </div>
            );

            const root = ReactDOM.createRoot(printableElement);
            root.render(<PrintableResume data={structuredData} />);

            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(printableElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / pdfWidth;
            const scaledHeight = canvasHeight / ratio;

            let heightLeft = scaledHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = -scaledHeight + heightLeft;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
                heightLeft -= pdfHeight;
            }

            const originalName = resumeFile.name.split('.').slice(0, -1).join('.') || 'resume';
            pdf.save(`${originalName}_improved.pdf`);

            root.unmount();

        } catch (err: any) {
            console.error("PDF generation failed:", err);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader />
            </div>
        );
    }

    if (error) {
        return (
             <div className="w-full max-w-xl mx-auto text-center bg-red-500/10 p-6 rounded-2xl border border-red-500/30">
                <p className="text-red-400">{error}</p>
                <button
                    onClick={onBack}
                    className="mt-6 flex items-center justify-center gap-2 mx-auto bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to Report
                </button>
             </div>
        );
    }
    
    return (
        <div className="animate-fade-in space-y-8 max-w-7xl mx-auto">
            <div className="absolute left-[-9999px] top-0 w-[8.5in]">
                <div id="printable-resume"></div>
            </div>

            <header className="flex justify-between items-center flex-wrap gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to Analysis
                </button>
                <h2 className="text-2xl font-bold text-white">Resume Editor</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        {isGeneratingPdf ? 'Generating...' : 'Download as PDF'}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Download as TXT
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor */}
                <Card className="lg:col-span-1 h-[70vh] flex flex-col">
                    <textarea
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        className="w-full h-full p-4 bg-transparent text-gray-300 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-xl"
                        placeholder="Your resume text..."
                    />
                </Card>

                {/* Suggestions & Score */}
                <div className="space-y-6">
                    <Card className="p-6 flex flex-col items-center">
                        <h3 className="text-lg font-semibold mb-3">Updated ATS Score</h3>
                        <RadialProgress score={currentAtsScore} />
                        <button
                            onClick={handleUpdateScore}
                            disabled={isUpdatingScore}
                            className="mt-4 flex items-center gap-2 text-sm bg-indigo-500/10 text-indigo-300 px-3 py-2 rounded-md hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <RefreshCwIcon className={`w-4 h-4 ${isUpdatingScore ? 'animate-spin' : ''}`} />
                            {isUpdatingScore ? 'Updating...' : 'Update Score'}
                        </button>
                    </Card>

                    <Card className="p-6 max-h-[45vh] flex flex-col">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><MagicWandIcon className="w-6 h-6 text-yellow-400" /> AI Suggestions</h3>
                        <div className="space-y-3 overflow-y-auto pr-2">
                            {suggestions.length > 0 ? (
                                suggestions.map((suggestion, index) => (
                                    <div key={index} className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                        <p className="text-xs text-gray-400 italic border-l-2 border-red-500 pl-2 mb-2">"{suggestion.originalText}"</p>
                                        <p className="text-xs text-gray-300 border-l-2 border-green-500 pl-2 mb-2">"{suggestion.suggestedChange}"</p>
                                        <p className="text-xs text-gray-400 mt-2">{suggestion.explanation}</p>
                                        <button 
                                            onClick={() => applySuggestion(suggestion)}
                                            className="mt-3 text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold"
                                        >
                                            Apply Change <ArrowRightIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-4">No suggestions at the moment. Your resume looks great, or try making some edits and updating your score!</p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
