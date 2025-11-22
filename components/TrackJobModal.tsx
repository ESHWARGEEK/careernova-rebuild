
import React, { useState, useEffect } from 'react';
import { JobListing, TrackedJob, ApplicationStatus } from '../types';
import { XCircleIcon } from './IconComponents';

interface TrackJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobListing | null;
}

const STATUS_OPTIONS: ApplicationStatus[] = ['Saved', 'Applied', 'Interviewing', 'Offer Received'];
const LOCAL_STORAGE_KEY = 'trackedJobs';

export const TrackJobModal: React.FC<TrackJobModalProps> = ({ isOpen, onClose, job }) => {
  const [status, setStatus] = useState<ApplicationStatus>('Saved');
  const [applicationDate, setApplicationDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Reset form when modal opens for a new job
    if (job) {
      setStatus('Saved');
      setApplicationDate(new Date().toISOString().split('T')[0]); // Default to today
      setNotes('');
    }
  }, [job, isOpen]);

  const handleSave = () => {
    if (!job) return;

    const newTrackedJob: TrackedJob = {
      ...job,
      id: `${job.company}-${job.title}-${job.location}`, // Create a simple unique ID
      status,
      applicationDate: status !== 'Saved' ? applicationDate : undefined,
      notes,
    };

    try {
      const existingJobsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existingJobs: TrackedJob[] = existingJobsRaw ? JSON.parse(existingJobsRaw) : [];
      
      // Avoid duplicates
      const jobIndex = existingJobs.findIndex(j => j.id === newTrackedJob.id);
      if (jobIndex > -1) {
        existingJobs[jobIndex] = newTrackedJob; // Update if exists
      } else {
        existingJobs.push(newTrackedJob);
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existingJobs));
      onClose();
    } catch (error) {
      console.error("Failed to save job to localStorage", error);
      // Optionally show an error to the user
    }
  };

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg flex flex-col animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Track Application</h2>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{job.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close modal">
            <XCircleIcon className="w-7 h-7" />
          </button>
        </header>

        <main className="p-6 space-y-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {status !== 'Saved' && (
            <div>
              <label htmlFor="applicationDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Application Date</label>
              <input
                type="date"
                id="applicationDate"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="mt-1 block w-full pl-3 pr-4 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              />
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full p-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md resize-y"
              placeholder="e.g., Contact person, next steps, specific requirements..."
            />
          </div>
        </main>
        
        <footer className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button onClick={handleSave} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:shadow-lg hover:opacity-90 transition-all duration-200">
            Save
          </button>
        </footer>
      </div>
    </div>
  );
};
