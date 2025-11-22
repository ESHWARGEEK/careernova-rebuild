
import React, { useState, useRef } from 'react';
import { UploadIcon, FileTextIcon, FilePdfIcon, FileDocIcon, XCircleIcon, SparklesIcon } from './IconComponents';

interface FileUploadProps {
  onAnalyze: (file: File) => void;
}

const ACCEPTED_FILE_TYPES = [
    'application/pdf', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain'
];
const ACCEPTED_FILE_EXTENSIONS = ".pdf,.docx,.txt";
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const FileUpload: React.FC<FileUploadProps> = ({ onAnalyze }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File | undefined | null): boolean => {
    setError(null);
    if (!file) return false;

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError("Invalid file type. Please upload a PDF, DOCX, or TXT file.");
      return false;
    }
    
    if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
        return false;
    }

    return true;
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (validateFile(file)) {
      setSelectedFile(file!);
    }
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (validateFile(file)) {
      setSelectedFile(file!);
    }
  };
  
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedFile) {
      onAnalyze(selectedFile);
    }
  };
  
  const getFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="w-full max-w-xl mx-auto bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl shadow-purple-500/10 border border-white/20 dark:border-gray-700/50 transition-all duration-300">
      <form onSubmit={handleSubmit}>
        {!selectedFile ? (
          <div 
            className={`relative flex flex-col justify-center items-center w-full h-64 border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer overflow-hidden group ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleButtonClick}
            role="button"
            aria-label="File upload dropzone"
          >
             <div className={`absolute inset-0 bg-purple-400/10 transition-all duration-300 ${isDragging ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}></div>
            <div className="text-center z-10 p-4">
              <UploadIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 group-hover:text-purple-500 transition-colors" />
              <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-purple-500 dark:text-purple-400">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">your resume file here</p>
              <div className="flex items-center justify-center space-x-3 mt-6">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><FilePdfIcon className="w-5 h-5 text-red-500/80" /> PDF</span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><FileDocIcon className="w-5 h-5 text-blue-500/80" /> DOCX</span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><FileTextIcon className="w-5 h-5 text-gray-500/80" /> TXT</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 font-medium">(Max file size: {MAX_FILE_SIZE_MB}MB)</p>
            </div>
          </div>
        ) : (
          <div className="bg-white/20 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-4">
               {selectedFile.type.includes('pdf') ? <FilePdfIcon className="w-10 h-10 text-red-500 flex-shrink-0" /> : selectedFile.type.includes('word') ? <FileDocIcon className="w-10 h-10 text-blue-500 flex-shrink-0" /> : <FileTextIcon className="w-10 h-10 text-gray-500 dark:text-gray-300 flex-shrink-0" />}
               <div className="flex-grow min-w-0">
                   <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{selectedFile.name}</p>
                   <p className="text-xs text-gray-500 dark:text-gray-400">{getFileSize(selectedFile.size)}</p>
               </div>
               <button type="button" onClick={handleRemoveFile} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" aria-label="Remove file">
                   <XCircleIcon className="w-6 h-6" />
               </button>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={ACCEPTED_FILE_EXTENSIONS}
          className="hidden"
        />

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400 text-center bg-red-500/10 p-2 rounded-md">{error}</p>}

        <button
          type="submit"
          disabled={!selectedFile}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg disabled:from-gray-500 disabled:to-gray-600 dark:disabled:from-gray-600 dark:disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/50 shadow-[0_10px_20px_rgba(120,_80,_220,_0.2)] hover:shadow-[0_15px_30px_rgba(120,_80,_220,_0.3)] disabled:shadow-none transform hover:scale-105 disabled:scale-100 animate-pulse-slow disabled:animate-none"
        >
          <SparklesIcon className="w-5 h-5" />
          Analyze My Resume
        </button>
      </form>
    </div>
  );
};
