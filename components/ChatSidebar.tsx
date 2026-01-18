
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, CreditMemoData, SourceFile, AiProvider, FieldCandidate, FieldSource } from '../types';
import { chatWithAiAgent } from '../services/agentService';

interface ChatSidebarProps {
  data: CreditMemoData;
  files: SourceFile[];
  isOpen: boolean;
  selectedProvider: AiProvider;
  onToggle: () => void;
  onPreviewFile: (file: SourceFile) => void;
  onApplyCandidate: (fieldPath: string, candidate: FieldCandidate, index: number) => void;
  onResolveConflict: (fieldPath: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  data, 
  files, 
  isOpen, 
  selectedProvider,
  onToggle, 
  onPreviewFile,
  onApplyCandidate,
  onResolveConflict
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'review'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: "Hello. I'm your AI Credit Assistant. I can help refine this analysis using deal documents and current memo context. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const providerLabel = selectedProvider === 'google' ? 'Gemini' : 'OpenAI';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      
      const responseText = await chatWithAiAgent({
        provider: selectedProvider,
        message: input,
        history,
        memoContext: data,
        files
      });

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: `Error: ${error.message || "The model encountered an error."}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Fixed TypeScript error: Added type casting for source as FieldSource to resolve 'unknown' property access issue
  const conflictFields = Object.entries(data.fieldSources || {})
    .filter(([path, source]) => (source as FieldSource).resolved === false)
    .map(([path, source]) => {
      return [path, data.fieldCandidates?.[path] || []] as [string, FieldCandidate[]];
    });

  return (
    <aside 
      className={`fixed top-0 right-0 h-full bg-white border-l border-slate-200 shadow-2xl transition-all duration-500 z-50 flex flex-col ${
        isOpen ? 'w-96' : 'w-0 overflow-hidden border-none'
      }`}
    >
      <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shadow-lg uppercase tracking-tighter text-white ${selectedProvider === 'google' ? 'bg-tdgreen shadow-tdgreen/20' : 'bg-blue-600 shadow-blue-600/20'}`}>
            {selectedProvider === 'google' ? 'G' : 'O'}
          </div>
          <div className="flex flex-col">
            <h3 className="font-black text-slate-800 tracking-tight text-[10px] uppercase leading-none">Credit Hub</h3>
            <span className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${selectedProvider === 'google' ? 'text-tdgreen' : 'text-blue-600'}`}>
              Provider: {providerLabel}
            </span>
          </div>
        </div>
        <button onClick={onToggle} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="bg-slate-50/50 border-b border-slate-100 p-1 flex">
        <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Assistant</button>
        <button onClick={() => setActiveTab('files')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${activeTab === 'files' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Files ({files.length})</button>
        <button onClick={() => setActiveTab('review')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl relative ${activeTab === 'review' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
          Review
          {conflictFields.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-orange-500 shadow-sm"></span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white" ref={scrollRef}>
        {activeTab === 'chat' ? (
          <div className="p-6 space-y-6">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] px-5 py-4 rounded-3xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none shadow-xl shadow-slate-900/10' : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-200'}`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 px-1">
                  {m.role === 'user' ? 'You' : 'Analyst AI'} • {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 self-start">
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${selectedProvider === 'google' ? 'bg-tdgreen' : 'bg-blue-600'}`}></div>
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${selectedProvider === 'google' ? 'bg-tdgreen' : 'bg-blue-600'}`} style={{ animationDelay: '150ms' }}></div>
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${selectedProvider === 'google' ? 'bg-tdgreen' : 'bg-blue-600'}`} style={{ animationDelay: '300ms' }}></div>
              </div>
            )}
          </div>
        ) : activeTab === 'files' ? (
          <div className="p-6 space-y-4">
            {files.map(file => (
              <div key={file.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl transition-all group cursor-pointer" onClick={() => onPreviewFile(file)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-110">{file.type === 'application/pdf' ? '📕' : '📄'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-xs truncate group-hover:text-tdgreen transition-colors">{file.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1].toUpperCase()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 space-y-8">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
              <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Extraction Review</h4>
              <p className="text-[11px] text-orange-700 leading-relaxed">AI has extracted new variants for already-filled fields. Select the correct values and click Accept to update the memo.</p>
            </div>

            {conflictFields.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-4 opacity-10">🛡️</div>
                <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">All Conflicts Resolved</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">No pending extractions require review.</p>
              </div>
            ) : (
              conflictFields.map(([path, candidates]) => {
                const selections = data.fieldSources?.[path]?.selectedIndices || [];
                return (
                  <div key={path} className="space-y-3 bg-slate-50/30 p-4 rounded-3xl border border-slate-100">
                    <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b pb-1">{path.split('.').pop()?.replace(/([A-Z])/g, ' $1')}</h5>
                    <div className="space-y-2">
                      {candidates.map((c, i) => {
                        const isActive = selections.includes(i);
                        return (
                          <div 
                            key={i} 
                            className={`p-3 rounded-xl border transition-all cursor-pointer group flex gap-3 ${isActive ? 'border-tdgreen bg-tdgreen-light/20' : 'border-slate-100 bg-white hover:border-tdgreen/30'}`} 
                            onClick={() => onApplyCandidate(path, c, i)}
                          >
                            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-tdgreen border-tdgreen text-white' : 'bg-white border-slate-200'}`}>
                              {isActive && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-slate-800 break-words block mb-1">{String(c.value)}</span>
                              <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                                <span className="truncate max-w-[100px]">{c.sourceFile}</span>
                                <span>•</span>
                                <span>P.{c.pageNumber}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button 
                      onClick={() => onResolveConflict(path)}
                      className="w-full py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10 hover:bg-tdgreen transition-all"
                    >
                      Accept Selection
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {activeTab === 'chat' && (
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Ask ${providerLabel}...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all pr-14 resize-none shadow-inner min-h-[90px]"
              rows={2}
            />
            <button onClick={handleSend} disabled={!input.trim() || isTyping} className={`absolute right-3 bottom-3 p-3 rounded-xl transition-all ${input.trim() && !isTyping ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default ChatSidebar;
