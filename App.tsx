
import React, { useState, useCallback } from 'react';
import { CreditMemoData, SectionKey } from './types';
import { SECTIONS, INITIAL_DATA } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SectionRenderer from './components/SectionRenderer';
import DocumentDropzone from './components/DocumentDropzone';
import { processDocumentWithAgents } from './services/agentService';
import { exportToWord } from './services/exportService';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>('borrower_details');
  const [data, setData] = useState<CreditMemoData>(INITIAL_DATA);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedCount, setExtractedCount] = useState(0);

  const handleUpdateData = useCallback((updates: Partial<CreditMemoData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleFileUpload = async (files: File[]) => {
    setIsProcessing(true);
    setExtractedCount(0);
    
    try {
      const extractedData = await processDocumentWithAgents(files);
      setData(prev => ({
        ...prev,
        ...extractedData
      }));

      const totalFields = Object.values(extractedData).reduce((acc, section) => 
        acc + (section && typeof section === 'object' ? Object.keys(section).length : 1), 0);
      setExtractedCount(totalFields);

    } catch (error) {
      console.error("AI extraction error:", error);
      alert("Extraction failed. Ensure your Gemini API Key is set in the environment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportWord = () => {
    exportToWord(data);
  };

  return (
    <div className="flex h-screen bg-[#f4f7f4] overflow-hidden text-slate-900">
      <Sidebar 
        sections={SECTIONS} 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header 
          isProcessing={isProcessing} 
          extractedCount={extractedCount}
        />
        
        <div className="bg-white border-b border-slate-200 px-8 py-4 z-10 shadow-sm">
          <div className="max-w-6xl mx-auto">
            <DocumentDropzone onUpload={handleFileUpload} isProcessing={isProcessing} />
          </div>
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
                    <p className="text-sm text-slate-500 font-medium">
                      Section status: {extractedCount > 0 ? 'AI Assisted' : 'Draft'}
                    </p>
                  </div>
                </div>
                
                {extractedCount > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black uppercase tracking-wider border border-emerald-100">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Data Synchronized
                  </div>
                )}
              </div>
              
              <div className="p-10">
                <SectionRenderer 
                  section={activeSection} 
                  data={data} 
                  onChange={handleUpdateData}
                />
              </div>
            </div>
            
            <div className="mt-10 flex justify-end gap-5 pb-24">
              {activeSection === 'document_preview' && (
                <>
                  <button 
                    className="px-8 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all font-bold text-sm active:scale-95 flex items-center gap-2"
                    onClick={() => window.print()}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Export to PDF
                  </button>
                  <button 
                    className="px-8 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all font-bold text-sm active:scale-95 flex items-center gap-2"
                    onClick={handleExportWord}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Export to Word
                  </button>
                </>
              )}
              <button 
                className="px-10 py-3 rounded-2xl bg-tdgreen text-white hover:bg-tdgreen-dark hover:shadow-2xl hover:shadow-tdgreen/20 transition-all font-bold text-sm active:scale-95 shadow-lg shadow-tdgreen/10"
                onClick={() => alert("Memo saved successfully.")}
              >
                Save
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;