
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ChatMessage, CreditMemoData, SourceFile } from '../types';

interface ChatSidebarProps {
  data: CreditMemoData;
  files: SourceFile[];
  isOpen: boolean;
  onToggle: () => void;
  onPreviewFile: (file: SourceFile) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ data, files, isOpen, onToggle, onPreviewFile }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: "Hello. I'm your AI Credit Assistant. I've indexed the uploaded deal documents and the current memo draft. How can I help you refine this analysis today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const initChat = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `
      You are a world-class Senior Syndicate Credit Analyst. 
      You are assisting a colleague in building a Credit Memo.
      
      CONTEXT:
      - Current Memo JSON: ${JSON.stringify(data)}
      - Uploaded Files: ${files.map(f => f.name).join(', ')}
      
      YOUR GOAL:
      1. Answer questions about the borrower's financials based on the documents.
      2. Help draft sections of the memo.
      3. Verify data with precision.
    `;

    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction,
        temperature: 0.1,
      }
    });
  };

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
      if (!chatRef.current) await initChat();
      
      const fileParts = files.slice(0, 3).map(f => ({
        inlineData: {
          data: f.dataUrl.split(',')[1],
          mimeType: f.type
        }
      }));

      const messageContent = {
        parts: [
          ...fileParts,
          { text: input }
        ]
      };

      const result = await chatRef.current!.sendMessageStream({
        message: messageContent as any
      });

      const modelId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: modelId, role: 'model', text: '', timestamp: new Date() }]);

      let fullText = '';
      for await (const chunk of result) {
        const chunkText = (chunk as GenerateContentResponse).text || '';
        fullText += chunkText;
        setMessages(prev => prev.map(m => m.id === modelId ? { ...m, text: fullText } : m));
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I encountered an error accessing the document context.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <aside 
      className={`fixed top-0 right-0 h-full bg-white border-l border-slate-200 shadow-2xl transition-all duration-500 z-50 flex flex-col ${
        isOpen ? 'w-96' : 'w-0 overflow-hidden border-none'
      }`}
    >
      <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-tdgreen text-white flex items-center justify-center text-sm font-black shadow-lg shadow-tdgreen/20">AI</div>
          <h3 className="font-black text-slate-800 tracking-tight text-xs uppercase">Credit Hub</h3>
        </div>
        <button 
          onClick={onToggle}
          className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="bg-slate-50/50 border-b border-slate-100 p-1 flex">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
            activeTab === 'chat' ? 'bg-white text-tdgreen shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Assistant
        </button>
        <button 
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
            activeTab === 'files' ? 'bg-white text-tdgreen shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Files ({files.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        {activeTab === 'chat' ? (
          <div className="p-6 space-y-6">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] px-5 py-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-tr-none shadow-xl shadow-slate-900/10' 
                    : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-200'
                }`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 px-1">
                  {m.role === 'user' ? 'You' : 'Analyst AI'} • {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 self-start">
                <div className="w-1.5 h-1.5 bg-tdgreen rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-tdgreen rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-tdgreen rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Current Deal Files</h4>
            {files.length === 0 ? (
              <div className="text-center py-20 opacity-40">
                <div className="text-4xl mb-4">📂</div>
                <p className="text-xs font-black uppercase tracking-widest">No files uploaded</p>
              </div>
            ) : (
              files.map(file => (
                <div 
                  key={file.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/20 transition-all group cursor-pointer"
                  onClick={() => onPreviewFile(file)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-110">
                      {file.type === 'application/pdf' ? '📕' : '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-xs truncate group-hover:text-tdgreen transition-colors">{file.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1].toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100/50 flex items-center justify-between">
                    <span className="text-[8px] font-black text-tdgreen uppercase tracking-widest flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-tdgreen"></div>
                      Indexed by AI
                    </span>
                    <button className="text-[8px] font-black text-slate-400 uppercase tracking-widest hover:text-tdgreen transition-colors">
                      Quick Preview →
                    </button>
                  </div>
                </div>
              ))
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about the deal..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-tdgreen/10 focus:border-tdgreen outline-none transition-all pr-14 resize-none shadow-inner min-h-[90px]"
              rows={2}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={`absolute right-3 bottom-3 p-3 rounded-xl transition-all ${
                input.trim() && !isTyping ? 'bg-tdgreen text-white hover:bg-tdgreen-dark' : 'bg-slate-200 text-slate-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default ChatSidebar;
