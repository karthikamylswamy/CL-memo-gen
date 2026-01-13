
import React from 'react';
import { AiModelId } from '../types';
import { AVAILABLE_MODELS } from '../constants';
import { getOpenAiKey } from '../services/agentService';

interface HeaderProps {
  isProcessing: boolean;
  extractedCount: number;
  lastSaved: Date | null;
  selectedModelId: AiModelId;
  onModelChange: (modelId: AiModelId) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  isProcessing, 
  extractedCount, 
  lastSaved,
  selectedModelId,
  onModelChange
}) => {
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];
  
  const isKeyMissing = currentModel.provider === 'openai' 
    ? !getOpenAiKey() 
    : !process.env.API_KEY;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-40">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 bg-tdgreen rounded flex items-center justify-center text-white font-black text-xl shadow-sm">
          TD
        </div>
        <h1 className="text-lg font-black text-slate-800 tracking-tight">Maple <span className="text-slate-400 font-normal ml-2">| Credit Memo Builder</span></h1>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Model Switcher */}
        <div className={`flex items-center gap-3 px-3 py-1.5 border rounded-xl transition-all ${isKeyMissing ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-col">
            <span className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1 ${isKeyMissing ? 'text-rose-500' : 'text-slate-400'}`}>
              {isKeyMissing ? '⚠️ KEY MISSING' : 'Active Intelligence'}
            </span>
            <select 
              value={selectedModelId}
              onChange={(e) => onModelChange(e.target.value as AiModelId)}
              className="bg-transparent text-[10px] font-black text-slate-700 uppercase tracking-widest outline-none cursor-pointer pr-2"
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.label} ({model.provider.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
          <div className={`w-px h-6 mx-1 ${isKeyMissing ? 'bg-rose-200' : 'bg-slate-200'}`}></div>
          <div className="flex items-center gap-1.5">
             <span className={`w-2 h-2 rounded-full animate-pulse ${isKeyMissing ? 'bg-rose-500' : (currentModel.provider === 'google' ? 'bg-tdgreen' : 'bg-blue-500')}`}></span>
             <span className={`text-[9px] font-black uppercase tracking-widest ${isKeyMissing ? 'text-rose-500' : (currentModel.provider === 'google' ? 'text-tdgreen' : 'text-blue-500')}`}>
               {currentModel.badge}
             </span>
          </div>
        </div>

        {lastSaved && !isProcessing && (
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm font-bold text-tdgreen animate-pulse">
            <svg className="animate-spin h-4 w-4 text-tdgreen" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </div>
        )}
        
        {extractedCount > 0 && !isProcessing && (
          <span className="bg-tdgreen-light text-tdgreen-dark px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight border border-tdgreen/10">
            {extractedCount} Fields Extracted
          </span>
        )}

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-700">Senior Analyst</p>
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
