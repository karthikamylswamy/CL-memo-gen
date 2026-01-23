
import React, { useState, useCallback, useEffect } from 'react';
import { CreditMemoData, SectionKey, SourceFile, AiProvider, FieldCandidate, FieldSource } from './types';
import { SECTIONS, getInitialData } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SectionRenderer from './components/SectionRenderer';
import DocumentDropzone from './components/DocumentDropzone';
import ChatSidebar from './components/ChatSidebar';
import FilePreviewModal from './components/FilePreviewModal';
import { processDocumentWithAgents } from './services/agentService';
import { exportToWord } from './services/exportService';
import * as db from './services/dbService';

/**
 * Array-safe deep merge to prevent converting arrays to objects
 */
const deepMerge = (target: any, source: any): any => {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== 'object') return source;
  
  const output = Array.isArray(target) ? [...target] : { ...target };
  
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  });
  return output;
};

const isFilled = (obj: any, path: string) => {
  const val = path.split('.').reduce((o, i) => (o && typeof o === 'object' ? o[i] : undefined), obj);
  if (val === undefined || val === null || val === '') return false;
  if (typeof val === 'number' && val === 0) return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
};

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>('borrower_details');
  const [data, setData] = useState<CreditMemoData>(getInitialData());
  const [uploadedFiles, setUploadedFiles] = useState<SourceFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedCount, setExtractedCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewFile, setPreviewFile] = useState<SourceFile | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('google');

  useEffect(() => {
    const init = async () => {
      try {
        const savedMemo = await db.loadMemo();
        const savedFiles = await db.loadFiles();
        if (savedMemo) {
          setData(savedMemo);
          const totalExtracted = Object.keys(savedMemo.fieldSources || {}).length;
          setExtractedCount(totalExtracted);
        }
        if (savedFiles) setUploadedFiles(savedFiles);
      } catch (err) {
        console.error("Failed to load data from IndexedDB:", err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const freshInitial = getInitialData();
    if (JSON.stringify(data) !== JSON.stringify(freshInitial)) {
      db.saveMemo(data).then(() => setLastSaved(new Date()));
    }
  }, [data]);

  const handleUpdateData = useCallback((updates: Partial<CreditMemoData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates };
      const totalExtracted = Object.keys(newData.fieldSources || {}).length;
      setExtractedCount(totalExtracted);
      return newData;
    });
  }, []);

  const handleApplyCandidate = useCallback((fieldPath: string, candidate: FieldCandidate, index: number) => {
    const keys = fieldPath.split('.');
    const updates = { ...data };
    const candidates = data.fieldCandidates?.[fieldPath] || [];
    
    const sourceInfo = data.fieldSources?.[fieldPath] || { filename: candidate.sourceFile, pageNumber: candidate.pageNumber };
    let selectedIndices = sourceInfo.selectedIndices || [];
    
    if (selectedIndices.includes(index)) {
      selectedIndices = selectedIndices.filter(i => i !== index);
    } else {
      selectedIndices = [...selectedIndices, index].sort((a, b) => a - b);
    }
    
    const selectedCandidates = candidates.filter((_, i) => selectedIndices.includes(i));
    const newValue = selectedCandidates.map(c => String(c.value)).join('\n\n');
    
    let current: any = updates;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = newValue;
    
    const fieldSources = { ...data.fieldSources };
    fieldSources[fieldPath] = {
      ...sourceInfo,
      filename: selectedCandidates.length > 0 ? selectedCandidates[0].sourceFile : candidate.sourceFile,
      pageNumber: selectedCandidates.length > 0 ? selectedCandidates[0].pageNumber : candidate.pageNumber,
      selectedIndices: selectedIndices,
      resolved: false 
    };
    
    updates.fieldSources = fieldSources;
    setData(updates);
  }, [data]);

  const handleResolveConflict = useCallback((fieldPath: string) => {
    const updates = { ...data };
    const fieldSources = { ...data.fieldSources };
    if (fieldSources[fieldPath]) {
      fieldSources[fieldPath] = {
        ...fieldSources[fieldPath],
        resolved: true
      };
      updates.fieldSources = fieldSources;
      setData(updates);
    }
  }, [data]);

  const handleFileUpload = async (files: File[]) => {
    setIsProcessing(true);
    
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
      const { data: extractedBatch, fieldSources: batchSources, fieldCandidates: batchCandidates } = await processDocumentWithAgents(files, selectedProvider);
      
      const mergedData = deepMerge(data, extractedBatch);
      const updatedFieldCandidates = { ...(data.fieldCandidates || {}) };
      const updatedFieldSources = { ...(data.fieldSources || {}) };

      Object.entries(batchCandidates).forEach(([path, candidates]) => {
        const wasPreviouslyFilled = isFilled(data, path);
        const batchSource = batchSources[path];
        
        if (!updatedFieldCandidates[path]) {
          updatedFieldCandidates[path] = candidates;
        } else {
          candidates.forEach(c => {
            const exists = updatedFieldCandidates[path].some(existing => 
              String(existing.value).toLowerCase() === String(c.value).toLowerCase()
            );
            if (!exists) updatedFieldCandidates[path].push(c);
          });
        }

        if (!updatedFieldSources[path]) {
          updatedFieldSources[path] = batchSource;
        } else {
          updatedFieldSources[path] = {
            ...updatedFieldSources[path],
            resolved: (wasPreviouslyFilled || !batchSource.resolved) ? false : true
          };
        }
      });

      // Agency ratings auto-resolution
      Object.keys(updatedFieldCandidates).forEach(path => {
        if (path.includes('publicRatings')) {
          const candidates = updatedFieldCandidates[path];
          if (candidates && candidates.length > 1) {
            let maxInfo = -1;
            let bestIdx = 0;
            candidates.forEach((c, idx) => {
              const infoSize = JSON.stringify(c.value).length;
              if (infoSize > maxInfo) {
                maxInfo = infoSize;
                bestIdx = idx;
              }
            });
            updatedFieldSources[path] = {
              ...updatedFieldSources[path],
              selectedIndices: [bestIdx],
              resolved: true
            };
            
            const keys = path.split('.');
            let current: any = mergedData;
            for (let i = 0; i < keys.length - 1; i++) {
              current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = candidates[bestIdx].value;
          }
        }
      });

      setData({
        ...mergedData,
        fieldCandidates: updatedFieldCandidates,
        fieldSources: updatedFieldSources
      } as CreditMemoData);
      
      setExtractedCount(Object.keys(updatedFieldSources).length);
    } catch (error) {
      console.error("AI batch extraction error:", error);
      alert("Extraction failed. Document processing may have timed out or reached model limits.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to clear this workspace?")) {
      try {
        await db.clearAllData();
        setData(getInitialData());
        setUploadedFiles([]);
        setExtractedCount(0);
        setLastSaved(null);
        setActiveSection('borrower_details');
      } catch (err) {
        console.error("Failed to clear data:", err);
      }
    }
  };

  const activeConflictsCount = Object.entries(data.fieldSources || {}).filter(([_, source]) => (source as FieldSource).resolved === false).length;

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
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
          hasConflicts={activeConflictsCount > 0}
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
            {isChatOpen ? 'Assistant' : 'Ask AI Agent'}
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
              {(activeSection === 'document_preview' || activeSection === 'executive_credit_memo') && (
                <button 
                  onClick={() => exportToWord(data, uploadedFiles)}
                  className="flex items-center gap-3 px-8 py-3 bg-tdgreen text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-tdgreen/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export Word Memo
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      <ChatSidebar 
        data={data}
        files={uploadedFiles}
        isOpen={isChatOpen}
        selectedProvider={selectedProvider}
        onToggle={() => setIsChatOpen(false)}
        onPreviewFile={setPreviewFile}
        onApplyCandidate={handleApplyCandidate}
        onResolveConflict={handleResolveConflict}
      />

      <FilePreviewModal 
        file={previewFile} 
        onClose={() => setPreviewFile(null)} 
      />
    </div>
  );
};

export default App;
