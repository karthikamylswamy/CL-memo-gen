
import React from 'react';
import { AiProvider } from '../types';
import { getAzureOpenAiKey } from '../services/agentService';

interface HeaderProps {
  isProcessing: boolean;
  extractedCount: number;
  lastSaved: Date | null;
  selectedProvider: AiProvider;
  onProviderChange: (provider: AiProvider) => void;
  hasConflicts?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  isProcessing, 
  extractedCount, 
  lastSaved,
  selectedProvider,
  onProviderChange,
  hasConflicts
}) => {
  const isKeyMissing = selectedProvider === 'openai' 
    ? !getAzureOpenAiKey() 
    : !process.env.API_KEY;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-40">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 bg-slate-800 rounded flex items-center justify-center text-white font-black text-xl shadow-sm">
          CM
        </div>
        <h1 className="text-lg font-black text-slate-800 tracking-tight">Credit Memo <span className="text-slate-400 font-normal ml-2">| AI Builder</span></h1>
      </div>
      
      <div className="flex items-center gap-6">
        {hasConflicts && !isProcessing && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full border border-orange-100 animate-in slide-in-from-right duration-500">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-[9px] font-black uppercase tracking-widest">Conflicts Detected</span>
          </div>
        )}

        <div className={`flex items-center gap-2 px-2 py-1 border rounded-lg transition-all ${isKeyMissing ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-col items-center">
            <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${isKeyMissing ? 'text-rose-500' : 'text-slate-400'}`}>
              {isKeyMissing ? '⚠️ KEY' : 'Action'}
            </span>
            <div className="relative flex items-center justify-center h-3 w-4 mt-0.5">
              <select 
                value={selectedProvider}
                onChange={(e) => onProviderChange(e.target.value as AiProvider)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              >
                <option value="google">Gemini (Google)</option>
                <option value="openai">GPT-4o (OpenAI)</option>
              </select>
              <svg className="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {lastSaved && !isProcessing && (
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm font-bold text-brandgreen animate-pulse">
            <svg className="animate-spin h-4 w-4 text-brandgreen" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </div>
        )}
        
        {extractedCount > 0 && !isProcessing && (
          <span className="bg-brandgreen-light text-brandgreen-dark px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight border border-brandgreen/10">
            {extractedCount} Fields Extracted
          </span>
        )}

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-700">Senior Analyst</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CIB-Credit</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <img 
              src="https://picsum.photos/seed/analyst/40/40" 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
