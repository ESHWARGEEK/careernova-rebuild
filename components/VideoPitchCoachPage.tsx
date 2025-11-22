import React, { useState, useEffect, useRef } from 'react';
import { Card } from './Card';
import { VideoIcon, SparklesIcon, CheckCircleIcon, LightbulbIcon, TrendingUpIcon } from './IconComponents';
import { analyzeVideoPitch } from '../services/geminiService';
import { VideoPitchFeedback } from '../types';
import { RadialProgress } from './RadialProgress';

type Status = 'idle' | 'permission' | 'ready' | 'recording' | 'processing' | 'results' | 'error';
const RECORDING_DURATION = 30; // 30 seconds
const FRAME_CAPTURE_INTERVAL = 2000; // Capture a frame every 2 seconds

// Since the hook was removed, we need to declare the SpeechRecognition type for older browsers.
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

const FeedbackDisplay: React.FC<{ feedback: VideoPitchFeedback }> = ({ feedback }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        <Card className="p-4 text-center">
            <h3 className="font-semibold">Speech Clarity</h3>
            <div className="my-2 flex justify-center"><RadialProgress score={feedback.speechClarity.score} size={80} strokeWidth={8} /></div>
            <p className="text-xs text-gray-400">{feedback.speechClarity.feedback}</p>
        </Card>
        <Card className="p-4 text-center">
            <h3 className="font-semibold">Pacing</h3>
            <div className="my-2 flex justify-center"><RadialProgress score={feedback.pacing.score} size={80} strokeWidth={8} /></div>
            <p className="text-xs text-gray-400">{feedback.pacing.feedback}</p>
        </Card>
        <Card className="p-4 text-center">
            <h3 className="font-semibold">Body Language</h3>
            <div className="my-2 flex justify-center"><RadialProgress score={feedback.bodyLanguage.score} size={80} strokeWidth={8} /></div>
            <p className="text-xs text-gray-400">{feedback.bodyLanguage.feedback}</p>
        </Card>
        <Card className="p-4 text-center">
            <h3 className="font-semibold">Eye Contact</h3>
            <div className="my-2 flex justify-center"><RadialProgress score={feedback.eyeContact.score} size={80} strokeWidth={8} /></div>
            <p className="text-xs text-gray-400">{feedback.eyeContact.feedback}</p>
        </Card>
         <Card className="p-4 text-center">
            <h3 className="font-semibold">Professionalism</h3>
            <div className="my-2 flex justify-center"><RadialProgress score={feedback.professionalism.score} size={80} strokeWidth={8} /></div>
            <p className="text-xs text-gray-400">{feedback.professionalism.feedback}</p>
        </Card>
        <Card className="p-6 md:col-span-2 lg:col-span-3">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-yellow-400"/>Overall Feedback</h3>
            <p className="text-sm text-gray-300">{feedback.overallFeedback}</p>
        </Card>
        <Card className="p-6 md:col-span-2 lg:col-span-3">
             <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><TrendingUpIcon className="w-5 h-5 text-sky-400"/>Actionable Improvements</h3>
              <ul className="space-y-3 list-disc list-inside">
                {feedback.actionableImprovements.map((step, i) => (
                    <li key={i} className="text-sm text-gray-300">{step}</li>
                ))}
            </ul>
        </Card>
    </div>
);


export const VideoPitchCoachPage: React.FC = () => {
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(RECORDING_DURATION);
    const [feedback, setFeedback] = useState<VideoPitchFeedback | null>(null);
    const [isVideoReady, setIsVideoReady] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<any | null>(null);
    const frameCaptureIntervalRef = useRef<number | null>(null);
    const timerIntervalRef = useRef<number | null>(null);
    const capturedFramesRef = useRef<string[]>([]);
    const transcriptRef = useRef('');
    
    const statusRef = useRef(status);
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    const cleanup = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        if (frameCaptureIntervalRef.current) clearInterval(frameCaptureIntervalRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        frameCaptureIntervalRef.current = null;
        timerIntervalRef.current = null;
        
        capturedFramesRef.current = [];
        transcriptRef.current = '';
        setIsVideoReady(false);
    };

    useEffect(() => {
        return () => cleanup(); // Cleanup on component unmount
    }, []);

    useEffect(() => {
        if ((status === 'ready' || status === 'recording') && videoRef.current && streamRef.current) {
            if (videoRef.current.srcObject !== streamRef.current) {
                videoRef.current.srcObject = streamRef.current;
            }
        }
    }, [status]);

    const requestPermissions = async () => {
        setStatus('permission');
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = mediaStream;
            setStatus('ready');
        } catch (err) {
            console.error(err);
            setError("Camera and microphone access denied. Please enable permissions in your browser settings.");
            setStatus('error');
        }
    };

    const stopRecording = () => {
        if (statusRef.current !== 'recording') return;
        
        statusRef.current = 'processing';
        setStatus('processing');

        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        if (frameCaptureIntervalRef.current) {
            clearInterval(frameCaptureIntervalRef.current);
            frameCaptureIntervalRef.current = null;
        }
        
        if (recognitionRef.current) {
            // Explicitly disable the onend handler to prevent restarts on manual/timed stop.
            // This is critical to distinguish a manual stop from an error-based stop.
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
        }

        setTimeout(handleAnalysis, 500); 
    };

    const startRecording = () => {
        if (!streamRef.current || !isVideoReady) return;
        setStatus('recording');
        setTimeLeft(RECORDING_DURATION);
        capturedFramesRef.current = [];
        transcriptRef.current = '';

        // Start Speech Recognition
        if ('webkitSpeechRecognition' in window) {
            recognitionRef.current = new window.webkitSpeechRecognition();
            const recognition = recognitionRef.current;
            recognition.continuous = true;
            recognition.interimResults = false;
            
            recognition.onresult = (event: any) => {
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        transcriptRef.current += event.results[i][0].transcript + ' ';
                    }
                }
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                // FIX: Add robust error handling for critical recognition failures.
                if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
                    setError(`Speech recognition failed: ${event.error}. Please check your microphone and browser permissions.`);
                    if (statusRef.current === 'recording') {
                        // Stop timers and intervals immediately
                        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                        if (frameCaptureIntervalRef.current) clearInterval(frameCaptureIntervalRef.current);
                        timerIntervalRef.current = null;
                        frameCaptureIntervalRef.current = null;
                        
                        // Stop recognition without triggering restart
                        if (recognitionRef.current) {
                            recognitionRef.current.onend = null;
                            recognitionRef.current.stop();
                        }
                        
                        // Update status to error
                        statusRef.current = 'error';
                        setStatus('error');
                    }
                } else if (event.error === 'no-speech') {
                    console.log("No speech detected, recognition will attempt to restart via onend handler.");
                }
            };

            recognition.onend = () => {
                // If recognition stops for any reason (e.g. "no-speech" timeout),
                // restart it as long as we are still in the 'recording' state.
                if (statusRef.current === 'recording') {
                    console.log("Speech recognition ended unexpectedly. Attempting to restart...");
                    try {
                        if (recognitionRef.current) {
                           recognitionRef.current.start();
                        }
                    } catch (e) {
                        console.error("Error restarting speech recognition:", e);
                    }
                }
            };

            recognition.start();
        }

        // Start Frame Capture
        const canvas = document.createElement('canvas');
        frameCaptureIntervalRef.current = window.setInterval(() => {
            if (videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 3 && videoRef.current.videoWidth > 0) {
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const frame = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                if(frame) capturedFramesRef.current.push(frame);
            }
        }, FRAME_CAPTURE_INTERVAL);

        // Start Countdown Timer
        timerIntervalRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopRecording();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleAnalysis = async () => {
        if (capturedFramesRef.current.length === 0) {
            setError("No video frames were captured. Please ensure your camera is not covered and has good lighting.");
            setStatus('error');
            cleanup();
            return;
        }

        try {
            const result = await analyzeVideoPitch(capturedFramesRef.current, transcriptRef.current.trim());
            setFeedback(result);
            setStatus('results');
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to analyze video pitch.");
            setStatus('error');
        }
    };
    
    const handleTryAgain = () => {
        cleanup();
        setError(null);
        setFeedback(null);
        setStatus('idle');
    }

    const renderContent = () => {
        switch (status) {
            case 'idle':
            case 'permission':
                return (
                     <div className="text-center">
                        <VideoIcon className="w-16 h-16 mx-auto text-gray-500"/>
                        <h2 className="mt-4 text-xl font-semibold">Video Pitch Coach</h2>
                        <p className="mt-2 text-gray-400 max-w-md mx-auto">Practice your 30-second elevator pitch and get instant, AI-powered feedback on your delivery and presentation.</p>
                        <button onClick={requestPermissions} disabled={status === 'permission'} className="mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50">
                            {status === 'permission' ? "Getting Ready..." : "Enable Camera & Mic"}
                        </button>
                    </div>
                );
             case 'ready':
             case 'recording':
                 return (
                     <div className="w-full max-w-2xl mx-auto">
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-transparent">
                             <video 
                                ref={videoRef} 
                                onCanPlay={() => setIsVideoReady(true)}
                                autoPlay 
                                muted 
                                playsInline 
                                className="w-full h-full object-cover transform scale-x-[-1]"
                             ></video>
                             {status === 'recording' && (
                                <div className="absolute top-3 right-3 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full flex items-center gap-2">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                    REC
                                </div>
                             )}
                              {status === 'recording' && (
                                <div className="absolute bottom-3 left-3 bg-black/50 text-white text-lg font-mono font-bold px-3 py-1 rounded-md">
                                    00:{timeLeft.toString().padStart(2, '0')}
                                </div>
                             )}
                        </div>
                        <div className="mt-6 flex justify-center">
                             {status === 'ready' && <button onClick={startRecording} disabled={!isVideoReady} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed">
                                {isVideoReady ? 'Start Recording' : 'Initializing...'}
                             </button>}
                             {status === 'recording' && <button onClick={stopRecording} className="bg-red-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">Stop Recording</button>}
                        </div>
                     </div>
                 );
            case 'processing':
                return (
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="mt-4 text-lg font-semibold">Analyzing your pitch...</p>
                        <p className="text-sm text-gray-400">This might take a moment.</p>
                    </div>
                );
            case 'results':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Your Feedback Report</h2>
                             <button onClick={handleTryAgain} className="bg-indigo-500/20 text-indigo-300 font-bold py-2 px-4 rounded-lg transition-colors hover:bg-indigo-500/30">
                                Record Again
                            </button>
                        </div>
                        {feedback && <FeedbackDisplay feedback={feedback} />}
                    </div>
                );
            case 'error':
                 return (
                     <div className="text-center bg-red-500/10 p-6 rounded-2xl border border-red-500/30 max-w-md mx-auto">
                        <p className="text-red-400 font-semibold">An Error Occurred</p>
                        <p className="mt-2 text-sm text-red-300">{error}</p>
                        <button onClick={handleTryAgain} className="mt-6 bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors">
                            Try Again
                        </button>
                    </div>
                );
        }
    };
    
    return (
        <div className="animate-fade-in flex items-center justify-center min-h-[60vh]">
            {renderContent()}
        </div>
    );
};