
import React, { useState, useEffect, useCallback } from 'react';
import { TrackedJob, ApplicationStatus } from '../types';
import { Card } from './Card';
import { BriefcaseIcon, Trash2Icon, CalendarIcon, FileTextIcon, ExternalLinkIcon } from './IconComponents';

const LOCAL_STORAGE_KEY = 'trackedJobs';
const STATUS_ORDER: ApplicationStatus[] = ['Saved', 'Applied', 'Interviewing', 'Offer Received'];

const TrackedJobCard: React.FC<{
    job: TrackedJob;
    onUpdate: (updatedJob: TrackedJob) => void;
    onDelete: (jobId: string) => void;
}> = ({ job, onUpdate, onDelete }) => {
    const [notes, setNotes] = useState(job.notes || '');

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdate({ ...job, status: e.target.value as ApplicationStatus });
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
    };
    
    const handleNotesBlur = () => {
        onUpdate({ ...job, notes });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ ...job, applicationDate: e.target.value });
    };

    return (
        <Card className="p-4 space-y-3">
            <div>
                <h3 className="font-bold text-md text-purple-300">{job.title}</h3>
                <p className="text-sm font-semibold">{job.company} - <span className="text-gray-400 font-normal">{job.location}</span></p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label className="text-xs text-gray-400">Status</label>
                    <select value={job.status} onChange={handleStatusChange} className="mt-1 block w-full p-2 text-sm border-gray-300 dark:border-gray-600 bg-white/10 dark:bg-gray-700/50 rounded-md focus:outline-none focus:ring-indigo-500">
                        {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {job.status !== 'Saved' && (
                     <div className="flex-1">
                        <label className="text-xs text-gray-400 flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> Application Date</label>
                        <input type="date" value={job.applicationDate || ''} onChange={handleDateChange} className="mt-1 block w-full p-2 text-sm border-gray-300 dark:border-gray-600 bg-white/10 dark:bg-gray-700/50 rounded-md focus:outline-none focus:ring-indigo-500" />
                    </div>
                )}
            </div>
            
            <div>
                <label className="text-xs text-gray-400 flex items-center gap-1"><FileTextIcon className="w-3 h-3"/> Notes</label>
                <textarea 
                    value={notes}
                    onChange={handleNotesChange}
                    onBlur={handleNotesBlur}
                    rows={3}
                    className="mt-1 block w-full p-2 text-sm border-gray-300 dark:border-gray-600 bg-white/10 dark:bg-gray-700/50 rounded-md resize-y focus:outline-none focus:ring-indigo-500"
                    placeholder="Add notes here..."
                />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold">
                    View Job <ExternalLinkIcon className="w-3 h-3"/>
                </a>
                <button onClick={() => onDelete(job.id)} className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300 font-semibold">
                    <Trash2Icon className="w-3 h-3"/> Delete
                </button>
            </div>
        </Card>
    );
};

export const JobTrackerPage: React.FC = () => {
    const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([]);

    useEffect(() => {
        try {
            const storedJobs = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedJobs) {
                setTrackedJobs(JSON.parse(storedJobs));
            }
        } catch (error) {
            console.error("Failed to load tracked jobs from localStorage", error);
        }
    }, []);

    const saveJobs = useCallback((jobs: TrackedJob[]) => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(jobs));
            setTrackedJobs(jobs);
        } catch (error) {
            console.error("Failed to save tracked jobs to localStorage", error);
        }
    }, []);

    const handleUpdateJob = (updatedJob: TrackedJob) => {
        const newJobs = trackedJobs.map(j => j.id === updatedJob.id ? updatedJob : j);
        saveJobs(newJobs);
    };

    const handleDeleteJob = (jobId: string) => {
        const newJobs = trackedJobs.filter(j => j.id !== jobId);
        saveJobs(newJobs);
    };

    const jobsByStatus = STATUS_ORDER.reduce((acc, status) => {
        acc[status] = trackedJobs.filter(job => job.status === status);
        return acc;
    }, {} as Record<ApplicationStatus, TrackedJob[]>);

    return (
        <div className="animate-fade-in space-y-6">
            {trackedJobs.length === 0 ? (
                <Card className="p-10 text-center">
                    <BriefcaseIcon className="w-12 h-12 mx-auto text-gray-500" />
                    <h2 className="mt-4 text-xl font-semibold">Your Job Tracker is Empty</h2>
                    <p className="mt-2 text-gray-400">Find jobs in the "Find Jobs" tab and track them here to manage your application process.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {STATUS_ORDER.map(status => (
                        <div key={status} className="space-y-4">
                            <h2 className="text-lg font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-sky-400">
                                {status} ({jobsByStatus[status].length})
                            </h2>
                            <div className="space-y-4">
                                {jobsByStatus[status].map(job => (
                                    <TrackedJobCard
                                        key={job.id}
                                        job={job}
                                        onUpdate={handleUpdateJob}
                                        onDelete={handleDeleteJob}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
