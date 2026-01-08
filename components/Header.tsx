
import React from 'react';

interface HeaderProps {
  isProcessing: boolean;
  extractedCount: number;
}

const Header: React.FC<HeaderProps> = ({ isProcessing, extractedCount }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 bg-tdgreen rounded flex items-center justify-center text-white font-black text-xl shadow-sm">
          TD
        </div>
        <h1 className="text-lg font-black text-slate-800 tracking-tight">Maple <span className="text-slate-400 font-normal ml-2">| Credit Memo Builder</span></h1>
      </div>
      
      <div className="flex items-center gap-6">
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm font-bold text-tdgreen animate-pulse">
            <svg className="animate-spin h-4 w-4 text-tdgreen" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            AI Agents Extracting Data...
          </div>
        )}
        
        {extractedCount > 0 && !isProcessing && (
          <span className="bg-tdgreen-light text-tdgreen-dark px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight border border-tdgreen/10">
            {extractedCount} Fields Auto-populated
          </span>
        )}

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-black text-slate-700">Senior Credit Analyst</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CIB-Credit</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm ring-1 ring-slate-100">
            <img 
              src="https://picsum.photos/seed/analyst/40/40" 
              alt="Profile" 
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
