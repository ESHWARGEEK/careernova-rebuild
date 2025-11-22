import React, { useState, useEffect, useRef } from 'react';
// FIX: 'LiveSession' is not an exported member of '@google/genai'. It has been removed from the import.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";
import { CareerPath, InterviewTurn, InterviewReportResult } from '../types';
import { XCircleIcon, BotIcon, UserIcon, SparklesIcon, CheckCircleIcon, LightbulbIcon, MessageSquareQuoteIcon, TrendingUpIcon, StarIcon, MessageCircleWarningIcon, SmileIcon, MehIcon, FrownIcon, PuzzleIcon } from './IconComponents';
import { ai, getInterviewFeedback } from '../services/geminiService';
import { RadialProgress } from './RadialProgress';
import { Card } from './Card';

// Audio Encoding/Decoding Helpers from Gemini API documentation
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

interface FeedbackReportDisplayProps {
    report: InterviewReportResult;
}

const FeedbackReportDisplay: React.FC<FeedbackReportDisplayProps> = ({ report }) => {
    const { feedback } = report;
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                    <h3 className="font-semibold text-sm">Clarity</h3>
                    <div className="my-2 flex justify-center"><RadialProgress score={feedback.clarityScore} size={80} strokeWidth={8} /></div>
                    <p className="text-xs text-gray-400">{feedback.clarityFeedback}</p>
                </Card>
                <Card className="p-4 text-center">
                    <h3 className="font-semibold text-sm">Relevance</h3>
                    <div className="my-2 flex justify-center"><RadialProgress score={feedback.relevanceScore} size={80} strokeWidth={8} /></div>
                    <p className="text-xs text-gray-400">{feedback.relevanceFeedback}</p>
                </Card>
                <Card className="p-4 text-center">
                    <h3 className="font-semibold text-sm">Confidence</h3>
                    <div className="my-2 flex justify-center"><RadialProgress score={feedback.confidenceScore} size={80} strokeWidth={8} /></div>
                    <p className="text-xs text-gray-400">{feedback.confidenceFeedback}</p>
                </Card>
                <Card className="p-4 text-center">
                    <h3 className="font-semibold text-sm flex items-center justify-center gap-1"><StarIcon className="w-4 h-4 text-yellow-400" /> STAR Method</h3>
                    <div className="my-2 flex justify-center"><RadialProgress score={feedback.starMethodAdherence.score} size={80} strokeWidth={8} /></div>
                    <p className="text-xs text-gray-400">{feedback.starMethodAdherence.feedback}</p>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                    <h3 className="font-bold mb-2 flex items-center gap-2"><MessageCircleWarningIcon className="w-5 h-5 text-amber-400"/>Filler Words</h3>
                    <p className="text-3xl font-bold text-center">{feedback.fillerWordCount}</p>
                    <p className="text-xs text-gray-400 text-center">approximate count</p>
                </Card>
                <Card className="p-4">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                        {feedback.sentiment === 'Positive' && <SmileIcon className="w-5 h-5 text-green-400" />}
                        {feedback.sentiment === 'Neutral' && <MehIcon className="w-5 h-5 text-gray-400" />}
                        {feedback.sentiment === 'Negative' && <FrownIcon className="w-5 h-5 text-red-400" />}
                        Overall Sentiment
                    </h3>
                    <p className={`text-3xl font-bold text-center ${
                        feedback.sentiment === 'Positive' ? 'text-green-400' :
                        feedback.sentiment === 'Neutral' ? 'text-gray-400' : 'text-red-400'
                    }`}>
                        {feedback.sentiment}
                    </p>
                </Card>
            </div>

            <Card className="p-4">
                <h3 className="font-bold mb-2 flex items-center gap-2"><PuzzleIcon className="w-5 h-5 text-sky-400"/>Relevant Keywords Used</h3>
                {feedback.relevantKeywordsUsed && feedback.relevantKeywordsUsed.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {feedback.relevantKeywordsUsed.map(kw => (
                            <span key={kw} className="px-2 py-1 text-xs font-medium rounded-md bg-sky-900/50 text-sky-300">{kw}</span>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">No specific keywords were identified. Try to incorporate terms from the job description.</p>
                )}
            </Card>

             <Card className="p-4">
                <h3 className="font-bold mb-2 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-yellow-400"/>Overall Feedback</h3>
                <p className="text-sm text-gray-300">{feedback.overallFeedback}</p>
            </Card>
             <Card className="p-4">
                 <h3 className="font-bold mb-2 flex items-center gap-2"><TrendingUpIcon className="w-5 h-5 text-sky-400"/>Example Improvements</h3>
                  <div className="space-y-3">
                    {feedback.exampleImprovements.map((item, i) => (
                        <div key={i} className="bg-black/20 p-3 rounded-md">
                             <p className="text-xs font-semibold text-gray-400">Your Answer:</p>
                             <p className="text-xs italic text-gray-400 border-l-2 border-red-500 pl-2">"{item.userAnswer}"</p>
                             <p className="text-xs font-semibold text-green-400 mt-2">Suggestion:</p>
                             <p className="text-xs text-gray-300 border-l-2 border-green-500 pl-2">{item.suggestion}</p>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
};


interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  careerPath: CareerPath | null;
  resumeSummary: string;
}

type InterviewPhase = 'idle' | 'connecting' | 'live' | 'processing' | 'report' | 'error';

export const InterviewModal: React.FC<InterviewModalProps> = ({ isOpen, onClose, careerPath, resumeSummary }) => {
  const [phase, setPhase] = useState<InterviewPhase>('idle');
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<InterviewTurn[]>([]);
  const [feedbackReport, setFeedbackReport] = useState<InterviewReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [liveInputText, setLiveInputText] = useState('');
  const [liveOutputText, setLiveOutputText] = useState('');

  // FIX: Use ReturnType to infer the session promise type from the `ai.live.connect` method since 'LiveSession' is not exported.
  const sessionPromiseRef = useRef<ReturnType<typeof ai.live.connect> | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  
  // Audio state references
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  // Transcription references
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  useEffect(() => {
    if (transcriptContainerRef.current) {
        transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcript, liveInputText, liveOutputText]);

  const cleanupAudio = () => {
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    inputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current?.close().catch(console.error);
    
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  useEffect(() => {
    if (isOpen && careerPath) {
      startInterview();
    } else {
      stopInterview();
      setPhase('idle');
    }
    
    return () => {
      stopInterview();
    };
  }, [isOpen]);

  const stopInterview = () => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close()).catch(console.error);
        sessionPromiseRef.current = null;
    }
    cleanupAudio();
    setIsModelSpeaking(false);
  };

  const startInterview = async () => {
    if (!careerPath) return;

    setPhase('connecting');
    setTranscript([]);
    setFeedbackReport(null);
    setIsModelSpeaking(false);
    setLiveInputText('');
    setLiveOutputText('');
    setError(null);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const systemInstruction = `You are an expert interviewer conducting a real-time, voice-based practice interview for the role of ${careerPath.role}. The candidate's resume summary is: "${resumeSummary}". Ask relevant behavioral and technical questions. Start with a friendly introduction and the first question. Wait for the user's response before asking the next question. Keep your responses concise and natural-sounding.`;

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                systemInstruction,
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
            callbacks: {
                onopen: () => {
                    setPhase('live');
                    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    inputAudioContextRef.current = inputAudioContext;
                    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                    
                    const source = inputAudioContext.createMediaStreamSource(stream);
                    mediaStreamSourceRef.current = source;

                    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        
                        if (sessionPromiseRef.current) {
                            sessionPromiseRef.current.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        }
                    };
                    source.connect(scriptProcessor);
                    
                    // The ScriptProcessorNode needs to be connected to the destination to be processed.
                    // To prevent echo, connect it through a GainNode with gain set to 0.
                    const gainNode = inputAudioContext.createGain();
                    gainNode.gain.setValueAtTime(0, inputAudioContext.currentTime);
                    scriptProcessor.connect(gainNode);
                    gainNode.connect(inputAudioContext.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.outputTranscription) {
                        currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                        setLiveOutputText(currentOutputTranscriptionRef.current);
                    }
                    if (message.serverContent?.inputTranscription) {
                        currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                        setLiveInputText(currentInputTranscriptionRef.current);
                    }
                    if (message.serverContent?.turnComplete) {
                        const userTurn = { speaker: 'user' as const, text: currentInputTranscriptionRef.current.trim() };
                        const modelTurn = { speaker: 'model' as const, text: currentOutputTranscriptionRef.current.trim() };
                        
                        setTranscript(prev => {
                            const newTurns = [];
                            // A complete turn is usually a question (model) followed by an answer (user).
                            if (modelTurn.text) newTurns.push(modelTurn);
                            if (userTurn.text) newTurns.push(userTurn);
                            return [...prev, ...newTurns];
                        });

                        currentInputTranscriptionRef.current = '';
                        currentOutputTranscriptionRef.current = '';
                        setLiveInputText('');
                        setLiveOutputText('');
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio) {
                        setIsModelSpeaking(true);
                        const outputAudioContext = outputAudioContextRef.current;
                        if (!outputAudioContext) return;

                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);

                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                        const sourceNode = outputAudioContext.createBufferSource();
                        sourceNode.buffer = audioBuffer;
                        sourceNode.connect(outputAudioContext.destination);
                        
                        sourceNode.addEventListener('ended', () => {
                            audioSourcesRef.current.delete(sourceNode);
                            if(audioSourcesRef.current.size === 0) {
                                setIsModelSpeaking(false);
                            }
                        });
                        
                        sourceNode.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        audioSourcesRef.current.add(sourceNode);
                    }
                    if (message.serverContent?.interrupted) {
                        setIsModelSpeaking(false);
                        audioSourcesRef.current.forEach(source => source.stop());
                        audioSourcesRef.current.clear();
                        nextStartTimeRef.current = 0;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    setError("A connection error occurred during the interview.");
                    setPhase('error');
                    stopInterview();
                },
                onclose: () => {
                    if(phase === 'live') { // only transition if closed unexpectedly
                        setPhase('idle');
                    }
                },
            },
        });

    } catch (err) {
        console.error("Failed to get microphone access or start session:", err);
        setError("Could not access your microphone. Please check your browser permissions and try again.");
        setPhase('error');
    }
  };
  
  const handleFinish = async () => {
    stopInterview();
    
    // Create a final transcript by combining completed turns and any in-progress text.
    let finalTranscript = [...transcript];
    const lastUserInput = currentInputTranscriptionRef.current.trim();
    const lastModelOutput = currentOutputTranscriptionRef.current.trim();

    // The model's partial output (question) should be added before the user's partial input (answer).
    if (lastModelOutput) {
        finalTranscript.push({ speaker: 'model', text: lastModelOutput });
    }
    if (lastUserInput) {
        finalTranscript.push({ speaker: 'user', text: lastUserInput });
    }
    
    // Guard against calling the API with no conversation data.
    if (finalTranscript.length === 0 || finalTranscript.every(t => !t.text)) {
        setError("No conversation was recorded to generate feedback. Please try the interview again.");
        setPhase('error');
        return;
    }
    
    // Guard against transcripts with no user input.
    if (!finalTranscript.some(turn => turn.speaker === 'user' && turn.text)) {
        setError("No response from you was recorded. Cannot generate feedback without your answers.");
        setPhase('error');
        return;
    }

    setPhase('processing');
    try {
        const report = await getInterviewFeedback(finalTranscript);
        setFeedbackReport(report);
        setPhase('report');
    } catch(e) {
        console.error("Failed to get feedback:", e);
        // Provide a more specific error message to the user.
        let errorMessage = "An unexpected error occurred.";
        if (e instanceof Error) {
            errorMessage = e.message;
            // Attempt to parse JSON error for cleaner display if it comes from the backend
            if (errorMessage.includes('{')) {
               try {
                   const parsed = JSON.parse(errorMessage.substring(errorMessage.indexOf('{')));
                   if (parsed.error && parsed.error.message) {
                       errorMessage = parsed.error.message;
                   }
               } catch (parseErr) {
                   // Ignore parsing error and use original message
               }
            }
        }
        setError(errorMessage);
        setPhase('error');
    }
  };
  
  if (!isOpen) return null;

  const renderContent = () => {
    switch(phase) {
        case 'connecting':
        case 'live':
             return (
                 <>
                    <main className="flex-grow flex flex-col p-6 text-center overflow-hidden">
                        <div className="flex-shrink-0 mb-4">
                            <div className={`relative w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-colors duration-300 ${isModelSpeaking ? 'bg-indigo-500/30' : 'bg-gray-500/20'}`}>
                                <div className={`absolute inset-0 rounded-full border-4 ${isModelSpeaking ? 'border-indigo-400 animate-pulse-slow' : 'border-transparent'}`}></div>
                                <BotIcon className={`w-12 h-12 text-gray-300 transition-transform duration-300 ${isModelSpeaking ? 'scale-110' : 'scale-100'}`} />
                            </div>
                            <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-200">
                                {phase === 'connecting' ? 'Connecting...' : isModelSpeaking ? "Interviewer is speaking..." : "Ready for your response"}
                            </p>
                        </div>
                        
                        <div ref={transcriptContainerRef} className="flex-grow bg-black/20 rounded-lg p-4 text-left overflow-y-auto space-y-4">
                            {transcript.map((turn, index) => (
                                <div key={index} className={`flex items-start gap-3 ${turn.speaker === 'user' ? 'justify-end' : ''}`}>
                                    {turn.speaker === 'model' && <BotIcon className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-1" />}
                                    <div className={`p-3 rounded-lg max-w-[80%] ${turn.speaker === 'model' ? 'bg-indigo-500/20' : 'bg-purple-500/20'}`}>
                                        <p className="text-sm text-gray-200">{turn.text}</p>
                                    </div>
                                    {turn.speaker === 'user' && <UserIcon className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />}
                                </div>
                            ))}
                            {/* Live transcriptions */}
                            {liveOutputText && (
                                <div className="flex items-start gap-3">
                                    <BotIcon className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-1" />
                                    <div className="p-3 rounded-lg max-w-[80%] bg-indigo-500/20">
                                        <p className="text-sm text-gray-200">{liveOutputText}<span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span></p>
                                    </div>
                                </div>
                            )}
                            {liveInputText && (
                                 <div className="flex items-start gap-3 justify-end">
                                    <div className="p-3 rounded-lg max-w-[80%] bg-purple-500/20">
                                        <p className="text-sm text-gray-200">{liveInputText}<span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span></p>
                                    </div>
                                    <UserIcon className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                                </div>
                            )}
                        </div>
                    </main>
                    <footer className="p-3 bg-white/50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 flex-shrink-0">
                         <button onClick={handleFinish} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors hover:bg-red-700">Finish Interview</button>
                    </footer>
                 </>
            );
        case 'processing':
            return (
                <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-lg font-semibold">Generating your feedback report...</p>
                </main>
            );
        case 'report':
            return (
                <main className="p-4 overflow-y-auto">
                    {feedbackReport && <FeedbackReportDisplay report={feedbackReport} />}
                </main>
            );
        case 'error':
             return (
                <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-red-400 font-semibold">An Error Occurred</p>
                    <p className="mt-2 text-sm text-red-300">{error || "Please try again."}</p>
                    <button onClick={onClose} className="mt-6 bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors">
                        Close
                    </button>
                </main>
            );
        default:
            return null;
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose} role="dialog">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border border-white/20 dark:border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-gray-900/80 z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {phase !== 'report' ? 'Live Interview Practice' : 'Performance Report'}
              </h2>
              <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">{careerPath?.role}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close modal">
              <XCircleIcon className="w-7 h-7" />
            </button>
        </header>

        {renderContent()}
      </div>
    </div>
  );
};