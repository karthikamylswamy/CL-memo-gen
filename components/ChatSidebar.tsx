
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ChatMessage, CreditMemoData, SourceFile, AiModelId } from '../types';
import { AVAILABLE_MODELS } from '../constants';
import { getOpenAiKey } from '../services/agentService';

interface ChatSidebarProps {
  data: CreditMemoData;
  files: SourceFile[];
  isOpen: boolean;
  selectedModelId: AiModelId;
  onToggle: () => void;
  onPreviewFile: (file: SourceFile) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  data, 
  files, 
  isOpen, 
  selectedModelId,
  onToggle, 
  onPreviewFile 
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: "Hello. I'm your AI Credit Assistant. I can leverage the provisioned intelligence model to help refine this analysis. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Gemini specific refs
  const chatRef = useRef<Chat | null>(null);
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  // Re-initialize chat if the provider or model changes
  useEffect(() => {
    chatRef.current = null; 
  }, [selectedModelId]);

  const initGeminiChat = async () => {
    if (!process.env.API_KEY) throw new Error("Google API Key missing.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `
      Senior Syndicate Credit Analyst Persona.
      Context: ${JSON.stringify(data)}
      Documents: ${files.map(f => f.name).join(', ')}
      Goal: Assist in memo building, verify data, and synthesize risks.
    `;

    chatRef.current = ai.chats.create({
      model: selectedModelId,
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
      if (currentModel.provider === 'google') {
        if (!chatRef.current) await initGeminiChat();
        
        const fileParts = files.slice(0, 3).map(f => ({
          inlineData: {
            data: f.dataUrl.split(',')[1],
            mimeType: f.type
          }
        }));

        const result = await chatRef.current!.sendMessageStream({
          message: {
            parts: [...fileParts, { text: input }]
          } as any
        });

        const modelId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: modelId, role: 'model', text: '', timestamp: new Date() }]);

        let fullText = '';
        for await (const chunk of result) {
          const chunkText = (chunk as GenerateContentResponse).text || '';
          fullText += chunkText;
          setMessages(prev => prev.map(m => m.id === modelId ? { ...m, text: fullText } : m));
        }
      } else {
        // OpenAI Chat
        const apiKey = getOpenAiKey();
        if (!apiKey) throw new Error("Missing OpenAI API Key. Please set it in System Settings.");

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: selectedModelId,
            messages: [
              { role: "system", content: `Credit Analyst Persona. Context: ${JSON.stringify(data)}` },
              { role: "user", content: input }
            ],
            temperature: 0.1
          })
        });

        if (!response.ok) {
           const err = await response.json();
           throw new Error(err.error?.message || "OpenAI communication failed.");
        }

        const result = await response.json();
        const modelText = result.choices[0].message.content;
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: modelText,
          timestamp: new Date()
        }]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: `Error: ${error.message || "The provisioned model encountered an error. Please verify your provider API keys."}`,
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
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shadow-lg uppercase tracking-tighter text-white ${currentModel.provider === 'google' ? 'bg-tdgreen shadow-tdgreen/20' : 'bg-blue-600 shadow-blue-600/20'}`}>
            {currentModel.provider === 'google' ? 'G' : 'O'}
          </div>
          <div className="flex flex-col">
            <h3 className="font-black text-slate-800 tracking-tight text-[10px] uppercase leading-none">Credit Hub</h3>
            <span className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${currentModel.provider === 'google' ? 'text-tdgreen' : 'text-blue-600'}`}>
              Model: {currentModel.label}
            </span>
          </div>
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
            activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Assistant
        </button>
        <button 
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
            activeTab === 'files' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
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
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${currentModel.provider === 'google' ? 'bg-tdgreen' : 'bg-blue-600'}`}></div>
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${currentModel.provider === 'google' ? 'bg-tdgreen' : 'bg-blue-600'}`} style={{ animationDelay: '150ms' }}></div>
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${currentModel.provider === 'google' ? 'bg-tdgreen' : 'bg-blue-600'}`} style={{ animationDelay: '300ms' }}></div>
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
              placeholder={`Ask ${currentModel.label}...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all pr-14 resize-none shadow-inner min-h-[90px]"
              rows={2}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={`absolute right-3 bottom-3 p-3 rounded-xl transition-all ${
                input.trim() && !isTyping ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400'
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
