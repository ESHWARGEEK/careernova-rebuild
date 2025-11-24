
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AnalysisResult, Suggestion, StructuredResume } from '../types';
import { getResumeSuggestions, getUpdatedAtsScore, structureResumeForPdf, getTextFromFile } from '../services/geminiService';
import { Card } from './Card';
import { RadialProgress } from './RadialProgress';
import { ArrowLeftIcon, MagicWandIcon, DownloadIcon, RefreshCwIcon, ArrowRightIcon, SparklesIcon, Trash2Icon, CheckCircleIcon } from './IconComponents';
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
    
    // Local Storage Key based on file name and last modified date to ensure uniqueness per file version
    const storageKey = `careernova_resume_${resumeFile.name}_${resumeFile.lastModified}`;
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);

    useEffect(() => {
        const loadResume = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Check local storage first
                const savedText = localStorage.getItem(storageKey);
                let textToUse = '';

                if (savedText) {
                    textToUse = savedText;
                    setSaveStatus('saved');
                } else {
                    // Use client-side text extraction if no saved version exists
                    textToUse = await getTextFromFile(resumeFile);
                }

                if (!textToUse) {
                    throw new Error("Could not extract text from the resume file. It might be empty or in an unreadable format.");
                }

                setResumeText(textToUse);

                // Fetch initial suggestions for the text
                const suggestionsResult = await getResumeSuggestions(textToUse);
                setSuggestions(suggestionsResult.suggestions || []);

            } catch (err: any) {
                console.error("Failed to load resume for editing:", err);
                setError(err.message || "Could not load resume for editing. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        loadResume();
    }, [resumeFile, storageKey]);

    // Auto-save logic with debounce
    useEffect(() => {
        if (!isLoading && resumeText) {
            setSaveStatus('saving');
            const handler = setTimeout(() => {
                localStorage.setItem(storageKey, resumeText);
                setSaveStatus('saved');
            }, 1000); // Save after 1 second of inactivity

            return () => clearTimeout(handler);
        }
    }, [resumeText, isLoading, storageKey]);

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

    const handleReset = async () => {
        if (window.confirm("Are you sure you want to discard all your edits and revert to the original file? This action cannot be undone.")) {
            setIsLoading(true);
            try {
                const originalText = await getTextFromFile(resumeFile);
                setResumeText(originalText);
                localStorage.removeItem(storageKey);
                setSaveStatus(null);
                
                // Refresh suggestions for original text
                const suggestionsResult = await getResumeSuggestions(originalText);
                setSuggestions(suggestionsResult.suggestions || []);
                
                // Reset score if needed, or recalculate
                const scoreResult = await getUpdatedAtsScore(originalText);
                setCurrentAtsScore(scoreResult.atsScore);

            } catch (e: any) {
                console.error("Failed to reset resume:", e);
                setError("Failed to reset resume.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const applySuggestion = (suggestion: Suggestion) => {
        let original = suggestion.originalText;
        const replacement = suggestion.suggestedChange;

        // Clean up common AI artifacts like surrounding quotes
        if ((original.startsWith('"') && original.endsWith('"')) || (original.startsWith("'") && original.endsWith("'"))) {
            original = original.slice(1, -1);
        }
        
        // Helper to escape regex special characters
        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        let newText = resumeText;
        let matchFound = false;

        // Strategy 1: Exact Match
        if (newText.includes(original)) {
            newText = newText.replace(original, replacement);
            matchFound = true;
        } 
        // Strategy 2: Trimmed Match
        else if (newText.includes(original.trim())) {
             newText = newText.replace(original.trim(), replacement);
             matchFound = true;
        }
        else {
            // Strategy 3: Flexible Whitespace Match (Regex)
            // This handles cases where original has single spaces but resume has newlines/tabs
            const words = original.trim().split(/\s+/);
            if (words.length > 0) {
                const patternSource = words.map(escapeRegExp).join('[\\s\\r\\n]+');
                try {
                    const regex = new RegExp(patternSource); // Case sensitive
                    if (regex.test(newText)) {
                        newText = newText.replace(regex, replacement);
                        matchFound = true;
                    } else {
                        // Strategy 4: Case Insensitive + Flexible Whitespace
                         const regexCi = new RegExp(patternSource, 'i');
                         if (regexCi.test(newText)) {
                             newText = newText.replace(regexCi, replacement);
                             matchFound = true;
                         }
                    }
                } catch (e) {
                    // Ignore regex errors
                }
            }
        }

        // Strategy 5: Normalized Mapping (Most Robust)
        // Ignores all whitespace/newlines completely to find the sequence of characters.
        if (!matchFound) {
            try {
                // Function to create a map of normalized indices to original indices
                const normalize = (str: string) => {
                    let normalized = '';
                    const map: number[] = [];
                    for (let i = 0; i < str.length; i++) {
                        if (!/\s/.test(str[i])) {
                            normalized += str[i].toLowerCase();
                            map.push(i);
                        }
                    }
                    return { normalized, map };
                };

                const resumeNorm = normalize(resumeText);
                const originalNorm = normalize(original);

                // Find the normalized string inside the normalized resume
                const index = resumeNorm.normalized.indexOf(originalNorm.normalized);

                if (index !== -1) {
                    // We found the sequence. Now map back to original indices.
                    const startIdx = resumeNorm.map[index];
                    const endIdx = resumeNorm.map[index + originalNorm.normalized.length - 1];
                    
                    // Replace the range in the original text
                    // Note: substring is end-exclusive, so we use endIdx + 1
                    const before = newText.substring(0, startIdx);
                    const after = newText.substring(endIdx + 1);
                    newText = before + replacement + after;
                    matchFound = true;
                }
            } catch (e) {
                console.error("Normalized matching failed", e);
            }
        }

        if (matchFound) {
             setResumeText(newText);
             // Remove the suggestion from the list
             setSuggestions(prev => prev.filter(s => s !== suggestion));
        } else {
             alert(`Could not automatically find the text:\n\n"${original.substring(0, 100)}${original.length > 100 ? '...' : ''}"\n\nIt may have been modified or formatted differently. Please edit manually.`);
        }
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

            // Enhanced Printable Resume Component for Professional Output
            const PrintableResume = ({ data }: { data: StructuredResume }) => (
                <div className="w-[210mm] min-h-[297mm] bg-white text-gray-900 p-[20mm] font-sans box-border selection:bg-none">
                    {/* Header */}
                    <header className="border-b-2 border-gray-900 pb-6 mb-8">
                        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-gray-900 mb-2">{data.name}</h1>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 font-medium">
                            {data.email && <span className="flex items-center">{data.email}</span>}
                            {data.phone && <span>• {data.phone}</span>}
                            {data.linkedin && <span>• {data.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
                        </div>
                    </header>

                    {/* Summary */}
                    {data.summary && (
                        <section className="mb-8">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-300 pb-1">Professional Profile</h2>
                            <p className="text-sm leading-relaxed text-gray-800 text-justify">{data.summary}</p>
                        </section>
                    )}

                    {/* Experience */}
                    {data.experience && data.experience.length > 0 && (
                        <section className="mb-8">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 border-b border-gray-300 pb-1">Professional Experience</h2>
                            <div className="space-y-6">
                                {data.experience.map((exp, i) => (
                                    <div key={i} className="break-inside-avoid">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="text-lg font-bold text-gray-900">{exp.role}</h3>
                                            <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">{exp.dates}</span>
                                        </div>
                                        <div className="text-md font-bold text-indigo-800 mb-2">{exp.company}</div>
                                        <ul className="list-disc list-outside ml-4 space-y-1.5 marker:text-gray-400">
                                            {exp.description.map((desc, j) => (
                                                <li key={j} className="text-sm text-gray-800 leading-snug pl-1 text-justify">{desc}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Education */}
                    {data.education && data.education.length > 0 && (
                        <section className="mb-8">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 border-b border-gray-300 pb-1">Education</h2>
                            <div className="space-y-4">
                                {data.education.map((edu, i) => (
                                    <div key={i} className="break-inside-avoid">
                                        <div className="flex justify-between items-baseline">
                                            <h3 className="text-md font-bold text-gray-900">{edu.institution}</h3>
                                            <span className="text-sm text-gray-600 font-medium">{edu.dates}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 italic">{edu.degree}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Skills */}
                    {data.skills && data.skills.length > 0 && (
                        <section>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-300 pb-1">Key Skills</h2>
                            <div className="text-sm leading-relaxed text-gray-800">
                                {data.skills.join(' • ')}
                            </div>
                        </section>
                    )}
                </div>
            );

            const root = ReactDOM.createRoot(printableElement);
            root.render(<PrintableResume data={structuredData} />);

            // Give React time to render
            await new Promise(resolve => setTimeout(resolve, 800));

            // High quality capture
            const canvas = await html2canvas(printableElement, { 
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            
            // Re-implementing simplified standard multi-page logic
            const pdf2 = new jsPDF('p', 'mm', 'a4');
            const pWidth = pdf2.internal.pageSize.getWidth();
            const pHeight = pdf2.internal.pageSize.getHeight();
            const cWidth = canvas.width;
            const cHeight = canvas.height;
            const r = cWidth / pWidth;
            const sHeight = cHeight / r;
            
            let hLeft = sHeight;
            let pos = 0;
            
            pdf2.addImage(imgData, 'PNG', 0, pos, pWidth, sHeight);
            hLeft -= pHeight;
            
            while (hLeft > 0) {
                pos -= pHeight; // Move image up by one full page height
                pdf2.addPage();
                pdf2.addImage(imgData, 'PNG', 0, pos, pWidth, sHeight);
                hLeft -= pHeight;
            }
            
            const originalName = resumeFile.name.split('.').slice(0, -1).join('.') || 'resume';
            pdf2.save(`${originalName}_improved.pdf`);

            root.unmount();

        } catch (err: any) {
            console.error("PDF generation failed:", err);
            setError("Failed to generate PDF. Please try again.");
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
            {/* Hidden Container for PDF Rendering - 210mm width for A4 */}
            <div className="absolute left-[-9999px] top-0 w-[210mm]">
                <div id="printable-resume"></div>
            </div>

            <header className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Back to Analysis
                    </button>
                </div>
                
                <div className="flex flex-col items-center">
                     <h2 className="text-2xl font-bold text-white">Resume Editor</h2>
                     {saveStatus === 'saved' && (
                         <span className="text-xs text-green-400 flex items-center gap-1 opacity-80 animate-fade-in">
                             <CheckCircleIcon className="w-3 h-3" /> Saved locally
                         </span>
                     )}
                     {saveStatus === 'saving' && (
                         <span className="text-xs text-gray-400 flex items-center gap-1 opacity-80 animate-pulse">
                             Saving...
                         </span>
                     )}
                </div>

                <div className="flex items-center gap-3">
                     <button 
                        onClick={handleReset}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Reset to original file"
                    >
                        <Trash2Icon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        {isGeneratingPdf ? 'Generating PDF...' : 'Download as PDF'}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Download as TXT
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor */}
                <Card className="lg:col-span-1 h-[75vh] flex flex-col">
                    <textarea
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        className="w-full h-full p-6 bg-transparent text-gray-300 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-xl"
                        placeholder="Your resume text..."
                        spellCheck={false}
                    />
                </Card>

                {/* Suggestions & Score */}
                <div className="space-y-6 h-[75vh] flex flex-col">
                    <Card className="p-6 flex flex-col items-center flex-shrink-0">
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

                    <Card className="p-6 flex-grow flex flex-col overflow-hidden">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><MagicWandIcon className="w-6 h-6 text-yellow-400" /> AI Suggestions</h3>
                        <div className="space-y-3 overflow-y-auto pr-2 flex-grow custom-scrollbar">
                            {suggestions.length > 0 ? (
                                suggestions.map((suggestion, index) => (
                                    <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                                        <div className="mb-2">
                                            <span className="text-xs uppercase font-bold text-red-400 block mb-1">Original</span>
                                            <p className="text-xs text-gray-400 italic bg-black/20 p-2 rounded border-l-2 border-red-500">"{suggestion.originalText}"</p>
                                        </div>
                                        <div className="mb-2">
                                            <span className="text-xs uppercase font-bold text-green-400 block mb-1">Suggestion</span>
                                            <p className="text-xs text-gray-300 font-medium bg-black/20 p-2 rounded border-l-2 border-green-500">"{suggestion.suggestedChange}"</p>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2 border-t border-gray-700 pt-2">{suggestion.explanation}</p>
                                        <button 
                                            onClick={() => applySuggestion(suggestion)}
                                            className="mt-3 w-full py-2 text-xs flex items-center justify-center gap-1 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 rounded font-semibold transition-colors"
                                        >
                                            Apply Change <ArrowRightIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <SparklesIcon className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-sm text-center">No suggestions at the moment.</p>
                                    <p className="text-xs text-center mt-1 opacity-70">Try updating your score to get new insights!</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
