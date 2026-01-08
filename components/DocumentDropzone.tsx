
import React, { useRef } from 'react';

interface DocumentDropzoneProps {
  onUpload: (files: File[]) => void;
  isProcessing: boolean;
}

const DocumentDropzone: React.FC<DocumentDropzoneProps> = ({ onUpload, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload(Array.from(e.target.files));
    }
  };

  return (
    <div 
      className={`relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-4 ${
        isProcessing 
          ? 'bg-slate-50 border-indigo-300 pointer-events-none cursor-wait' 
          : 'bg-indigo-50/30 border-indigo-200 hover:border-indigo-400 cursor-pointer'
      }`}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
        isProcessing ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'
      }`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      
      <div className="text-center">
        <p className={`text-sm font-bold ${isProcessing ? 'text-slate-500' : 'text-slate-700'}`}>
          {isProcessing ? 'Agentic Extraction in Progress...' : 'Upload Deal Documents'}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {isProcessing 
            ? 'Analyzing financials, covenants, and credit structures...' 
            : 'Drop your Credit Agreement, Financial Statements, or Teaser PDF here'}
        </p>
      </div>
      
      {isProcessing && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl backdrop-blur-[1px]">
          <div className="flex flex-col items-center">
             <div className="flex gap-1 mb-2">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
             <p className="text-xs font-bold text-indigo-700 uppercase tracking-tighter">AI Agents Working</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDropzone;
