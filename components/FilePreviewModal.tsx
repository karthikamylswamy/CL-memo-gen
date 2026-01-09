
import React from 'react';
import { SourceFile } from '../types';

interface FilePreviewModalProps {
  file: SourceFile | null;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-6xl h-full bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-tdgreen text-white flex items-center justify-center text-xl shadow-lg shadow-tdgreen/20">
              {isPdf ? '📕' : isImage ? '🖼️' : '📄'}
            </div>
            <div>
              <h3 className="font-black text-slate-800 tracking-tight leading-none">{file.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1].toUpperCase()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href={file.dataUrl} 
              download={file.name}
              className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
            >
              Download Original
            </a>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 overflow-hidden relative">
          {isPdf ? (
            <embed 
              src={file.dataUrl} 
              type="application/pdf" 
              className="w-full h-full" 
            />
          ) : isImage ? (
            <div className="h-full flex items-center justify-center p-8 overflow-auto">
              <img 
                src={file.dataUrl} 
                alt={file.name} 
                className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" 
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20">
              <div className="text-8xl mb-8 opacity-20">📎</div>
              <h4 className="text-2xl font-black text-slate-800 tracking-tight">Preview Not Supported</h4>
              <p className="text-slate-500 max-w-md mt-4 font-medium">
                This file format cannot be viewed directly in the browser. Please download the document to review its contents.
              </p>
              <a 
                href={file.dataUrl} 
                download={file.name}
                className="mt-8 px-10 py-4 bg-tdgreen text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-tdgreen/20 hover:scale-105 transition-all"
              >
                Download Document
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
