
import React, { useState, useCallback, useEffect } from 'react';
import { CreditMemoData, SectionKey, SourceFile } from './types';
import { SECTIONS, INITIAL_DATA } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SectionRenderer from './components/SectionRenderer';
import DocumentDropzone from './components/DocumentDropzone';
import ChatSidebar from './components/ChatSidebar';
import FilePreviewModal from './components/FilePreviewModal';
import { processDocumentWithAgents } from './services/agentService';
import { exportToWord } from './services/exportService';
import * as db from './services/dbService';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>('borrower_details');
  const [data, setData] = useState<CreditMemoData>(INITIAL_DATA);
  const [uploadedFiles, setUploadedFiles] = useState<SourceFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedCount, setExtractedCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewFile, setPreviewFile] = useState<SourceFile | null>(null);

  useEffect(() => {
    const init = async () => {
      const savedMemo = await db.loadMemo();
      const savedFiles = await db.loadFiles();
      if (savedMemo) setData(savedMemo);
      if (savedFiles) setUploadedFiles(savedFiles);
    };
    init();
  }, []);

  useEffect(() => {
    if (data !== INITIAL_DATA) {
      db.saveMemo(data).then(() => setLastSaved(new Date()));
    }
  }, [data]);

  const handleUpdateData = useCallback((updates: Partial<CreditMemoData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleFileUpload = async (files: File[]) => {
    setIsProcessing(true);
    setExtractedCount(0);
    
    const fileLoadPromises = files.map(file => {
      return new Promise<SourceFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const sourceFile: SourceFile = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: e.target?.result as string
          };
          await db.saveFile(sourceFile);
          resolve(sourceFile);
        };
        reader.readAsDataURL(file);
      });
    });

    const loadedSourceFiles = await Promise.all(fileLoadPromises);
    setUploadedFiles(prev => [...prev, ...loadedSourceFiles]);

    try {
      const { data: extractedData, fieldSources } = await processDocumentWithAgents(files);
      
      const newData = {
        ...data,
        ...extractedData,
        fieldSources: {
          ...(data.fieldSources || {}),
          ...fieldSources
        }
      };
      
      setData(newData);
      setExtractedCount(Object.keys(fieldSources).length);
    } catch (error) {
      console.error("AI extraction error:", error);
      alert("Extraction failed. Check your API key.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to clear this workspace?")) {
      await db.clearAllData();
      setData(INITIAL_DATA);
      setUploadedFiles([]);
      setExtractedCount(0);
      setLastSaved(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#f4f7f4] overflow-hidden text-slate-900 font-sans">
      <Sidebar 
        sections={SECTIONS} 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
        onReset={handleReset}
      />
      
      <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-500 ${isChatOpen ? 'mr-96' : 'mr-0'}`}>
        <Header 
          isProcessing={isProcessing} 
          extractedCount={extractedCount}
          lastSaved={lastSaved}
        />
        
        <div className="bg-white border-b border-slate-200 px-8 py-4 z-10 shadow-sm flex items-center justify-between">
          <div className="flex-1 max-w-4xl">
            <DocumentDropzone onUpload={handleFileUpload} isProcessing={isProcessing} />
          </div>
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`ml-6 p-4 rounded-2xl flex items-center gap-3 transition-all font-black text-xs uppercase tracking-widest border-2 ${
              isChatOpen 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
                : 'bg-white text-slate-700 border-slate-200 hover:border-tdgreen/50 hover:bg-tdgreen-light/20 shadow-sm'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isChatOpen ? 'bg-tdgreen' : 'bg-slate-300'} animate-pulse`}></div>
            {isChatOpen ? 'Hide Assistant' : 'AI Assistant'}
          </button>
        </div>

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
          <div className="max-w-6xl mx-auto px-8 py-8">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/20 border border-slate-200 overflow-hidden transition-all duration-700">
              <div className="p-8 border-b border-slate-100 bg-slate-50/20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100 text-2xl">
                    {SECTIONS.find(s => s.id === activeSection)?.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                      {SECTIONS.find(s => s.id === activeSection)?.label}
                    </h2>
                  </div>
                </div>
                {uploadedFiles.length > 0 && (
                  <button 
                    onClick={() => setActiveSection('source_documents')}
                    className="text-[10px] font-black uppercase tracking-widest text-tdgreen hover:bg-tdgreen-light/50 px-4 py-2 rounded-xl transition-all"
                  >
                    View {uploadedFiles.length} Source Files
                  </button>
                )}
              </div>
              
              <div className="p-10">
                <SectionRenderer 
                  section={activeSection} 
                  data={data} 
                  files={uploadedFiles}
                  onChange={handleUpdateData}
                />
              </div>
            </div>
            
            <div className="mt-10 flex justify-end gap-5 pb-24">
              <button 
                className="px-10 py-3 rounded-2xl bg-tdgreen text-white hover:bg-tdgreen-dark shadow-lg shadow-tdgreen/10 font-bold text-sm"
                onClick={() => alert("Workspace saved.")}
              >
                Force Save
              </button>
            </div>
          </div>
        </main>
      </div>

      <ChatSidebar 
        data={data}
        files={uploadedFiles}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(false)}
        onPreviewFile={setPreviewFile}
      />

      <FilePreviewModal 
        file={previewFile} 
        onClose={() => setPreviewFile(null)} 
      />
    </div>
  );
};

export default App;
