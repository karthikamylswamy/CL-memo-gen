
import React, { useState } from 'react';
import { CreditMemoData, SectionKey, SourceFile } from '../types';

interface SectionRendererProps {
  section: SectionKey;
  data: CreditMemoData;
  files?: SourceFile[];
  onChange: (updates: Partial<CreditMemoData>) => void;
}

const getNested = (obj: any, path: string) => path.split('.').reduce((o, i) => (o && typeof o === 'object' ? o[i] : undefined), obj) ?? '';

const SourceBadge = ({ filename }: { filename?: string }) => {
  if (!filename) return null;
  return (
    <div className="group relative inline-flex ml-2">
      <div className="p-1 bg-tdgreen/10 rounded-lg text-tdgreen hover:bg-tdgreen/20 transition-all cursor-help">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-slate-900 text-white text-[10px] font-black py-1.5 px-3 rounded-lg whitespace-nowrap shadow-xl flex items-center gap-2">
          <span className="opacity-60 uppercase tracking-widest">Source:</span> {filename}
        </div>
        <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
      </div>
    </div>
  );
};

const Input = ({ 
  label, 
  value, 
  onChange, 
  source,
  type = "text", 
  placeholder = "" 
}: { 
  label: string, 
  value: any, 
  onChange: (val: any) => void, 
  source?: string,
  type?: string, 
  placeholder?: string 
}) => {
  const charCount = typeof value === 'string' ? value.length : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
          <SourceBadge filename={source} />
        </div>
        {type === 'text' && (
          <span className={`text-[9px] font-bold uppercase tracking-tighter ${charCount >= 250 ? 'text-rose-500' : 'text-slate-400'}`}>
            {charCount}/250
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          maxLength={type === 'text' ? 250 : undefined}
          value={value || ''}
          onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
          className={`w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-4 focus:ring-tdgreen/10 focus:border-tdgreen outline-none transition-all shadow-sm font-medium text-sm ${source ? 'ring-2 ring-tdgreen/5 border-tdgreen/30' : ''}`}
        />
        {source && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-tdgreen animate-pulse"></div>}
      </div>
    </div>
  );
};

const TextArea = ({ 
  label, 
  value, 
  onChange, 
  source,
  rows = 4, 
  className = "" 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  source?: string,
  rows?: number, 
  className?: string 
}) => {
  const charCount = typeof value === 'string' ? value.length : 0;
  const MAX_NARRATIVE = 5000; 

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
          <SourceBadge filename={source} />
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-tighter ${charCount >= MAX_NARRATIVE ? 'text-rose-500' : 'text-slate-400'}`}>
          {charCount}/{MAX_NARRATIVE}
        </span>
      </div>
      <div className="relative">
        <textarea
          rows={rows}
          maxLength={MAX_NARRATIVE}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-4 focus:ring-tdgreen/10 focus:border-tdgreen outline-none transition-all resize-none shadow-sm text-sm leading-relaxed ${source ? 'ring-2 ring-tdgreen/5 border-tdgreen/30' : ''}`}
        />
        {source && <div className="absolute right-4 top-4 w-1.5 h-1.5 rounded-full bg-tdgreen animate-pulse"></div>}
      </div>
    </div>
  );
};

const SectionRenderer: React.FC<SectionRendererProps> = ({ section, data, files = [], onChange }) => {
  const [selectedFile, setSelectedFile] = useState<SourceFile | null>(null);

  const setNested = (path: string, val: any) => {
    const keys = path.split('.');
    const updates = { ...data };
    let current = updates;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = val;
    onChange(updates);
  };

  const wrapInput = (label: string, path: string, type = "text") => (
    <Input 
      label={label} 
      value={getNested(data, path)} 
      source={data.fieldSources?.[path]}
      onChange={(val) => setNested(path, val)} 
      type={type}
    />
  );

  const wrapTextArea = (label: string, path: string, rows = 4, className = "") => (
    <TextArea 
      label={label} 
      value={getNested(data, path)} 
      source={data.fieldSources?.[path]}
      onChange={(val) => setNested(path, val)} 
      rows={rows} 
      className={className}
    />
  );

  const wrapCheckbox = (label: string, path: string) => (
    <label className="flex items-center gap-4 p-5 rounded-xl border border-slate-100 hover:border-tdgreen/20 hover:bg-tdgreen-light/30 cursor-pointer transition-all shadow-sm bg-white group">
      <input
        type="checkbox"
        checked={!!getNested(data, path)}
        onChange={(e) => setNested(path, e.target.checked)}
        className="w-6 h-6 text-tdgreen rounded-lg border-slate-300 focus:ring-tdgreen transition-all cursor-pointer"
      />
      <div className="flex flex-col">
        <span className="text-sm font-bold text-slate-700 group-hover:text-tdgreen-dark transition-colors">{label}</span>
        {data.fieldSources?.[path] && (
          <span className="text-[8px] font-black text-tdgreen uppercase tracking-widest mt-1">Source: {data.fieldSources[path]}</span>
        )}
      </div>
    </label>
  );

  const PreviewRow = ({ label, value }: { label: string, value: any }) => (
    <div className="flex border-b border-slate-100 py-3 text-sm">
      <span className="w-1/3 text-slate-400 font-bold uppercase tracking-[0.1em] text-[10px]">{label}:</span>
      <span className="w-2/3 font-black text-slate-800">{value || "N/A"}</span>
    </div>
  );

  const PreviewNarrative = ({ label, value }: { label: string, value: string }) => (
    <div className="space-y-2 mt-4">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-[#fcfdfc] border border-tdgreen/10 p-6 rounded-2xl shadow-sm italic">
        {value || "No information provided."}
      </div>
    </div>
  );

  const Header = ({ title }: { title: string }) => (
    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 pb-3 mt-4 mb-4 col-span-full">
      {title}
    </h3>
  );

  if (section === 'source_documents') {
    return (
      <div className="h-full flex flex-col gap-8 animate-in fade-in duration-700">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800">Deal Repository</h3>
            <p className="text-sm text-slate-500 font-medium">Review and preview the source documentation used for extraction.</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Files:</span>
            <span className="font-black text-slate-700">{files.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {files.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-slate-200 rounded-[2rem] text-center">
                <p className="text-slate-400 font-bold text-sm">No documents uploaded yet.</p>
              </div>
            ) : (
              files.map(file => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all group ${
                    selectedFile?.id === file.id
                      ? 'bg-tdgreen border-tdgreen text-white shadow-xl shadow-tdgreen/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-tdgreen/40 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                    selectedFile?.id === file.id ? 'bg-white/20' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {file.type.includes('pdf') ? '📕' : '📄'}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-black truncate text-sm">{file.name}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${
                      selectedFile?.id === file.id ? 'text-white/60' : 'text-slate-400'
                    }`}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1].toUpperCase()}
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    selectedFile?.id === file.id ? 'bg-white/20' : 'bg-slate-50 text-slate-300 opacity-0 group-hover:opacity-100'
                  }`}>
                    →
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="bg-slate-100 rounded-[2rem] min-h-[500px] border border-slate-200 overflow-hidden relative flex flex-col">
            {selectedFile ? (
              <>
                <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[200px]">
                    Previewing: {selectedFile.name}
                  </span>
                  <a 
                    href={selectedFile.dataUrl} 
                    download={selectedFile.name}
                    className="text-tdgreen hover:text-tdgreen-dark text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                  >
                    Download Original
                  </a>
                </div>
                <div className="flex-1 overflow-hidden">
                  {selectedFile.type.includes('image') ? (
                    <div className="h-full flex items-center justify-center p-8">
                      <img src={selectedFile.dataUrl} alt="Source Preview" className="max-w-full max-h-full rounded-lg shadow-2xl" />
                    </div>
                  ) : selectedFile.type.includes('pdf') ? (
                    <embed src={selectedFile.dataUrl} type="application/pdf" width="100%" height="100%" />
                  ) : (
                    <div className="h-full flex items-center justify-center p-12 text-center flex-col gap-4">
                      <div className="text-4xl">📎</div>
                      <p className="text-sm font-bold text-slate-500">Preview not available for this file type.</p>
                      <a href={selectedFile.dataUrl} download={selectedFile.name} className="px-6 py-2 bg-tdgreen text-white rounded-xl text-xs font-black uppercase tracking-widest">Download to View</a>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center text-slate-400">
                <div className="text-6xl mb-6 opacity-20">📂</div>
                <p className="text-sm font-black uppercase tracking-widest">Select a document to preview</p>
                <p className="text-xs mt-2 max-w-[200px]">Click any uploaded file in the list to examine its content.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle other sections as before...
  switch (section) {
    case 'borrower_details':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {wrapInput("Borrower Name", "primaryBorrower.borrowerName")}
          {wrapInput("Originating Office", "primaryBorrower.originatingOffice")}
          {wrapInput("Group", "primaryBorrower.group")}
          {wrapInput("Account Classification", "primaryBorrower.accountClassification")}
          <Header title="Policy & Risk Classifications" />
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {wrapCheckbox("Quarterly Account Review", "primaryBorrower.quarterlyReview")}
            {wrapCheckbox("Leveraged Lending Transaction", "primaryBorrower.leveragedLending")}
            {wrapCheckbox("Strategic Loan Classification", "primaryBorrower.strategicLoan")}
            {wrapCheckbox("Credit Standard Exception", "primaryBorrower.creditException")}
            {wrapCheckbox("Covenant-Lite Loan", "primaryBorrower.covenantLite")}
            {wrapCheckbox("Weak Underwriting Loan", "primaryBorrower.weakUnderwriting")}
            {wrapCheckbox("TDS Policy Exception", "primaryBorrower.tdsPolicyException")}
          </div>
        </div>
      );

    case 'purpose':
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {wrapTextArea("Business Purpose (e.g., Acquisition Details)", "purpose.businessPurpose")}
          {wrapTextArea("Adjudication Considerations", "purpose.adjudicationConsiderations")}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {wrapInput("Annual Review Status", "purpose.annualReviewStatus")}
            <div className="space-y-4">
              <Header title="Review Purpose Breakdown" />
              <div className="grid grid-cols-1 gap-3">
                {wrapCheckbox("New Facilities", "purpose.reviewPurpose.newFacilities")}
                {wrapCheckbox("Financial Covenants", "purpose.reviewPurpose.financialCovenants")}
                {wrapCheckbox("Maturity Dates", "purpose.reviewPurpose.maturityDates")}
              </div>
            </div>
          </div>
        </div>
      );

    case 'credit_exposure':
      return (
        <div className="space-y-10 animate-in fade-in duration-500">
          <Header title="Credit Position Summary" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wrapInput("Previous Authorized", "creditPosition.previousAuthorization", "number")}
            {wrapInput("Present Position", "creditPosition.presentPosition", "number")}
            {wrapInput("Credit Requested", "creditPosition.creditRequested", "number")}
            {wrapInput("Committed Over 1 Year", "creditPosition.committedOverOneYear", "number")}
            {wrapInput("Total Excl. Trading", "creditPosition.totalExcludingTrading", "number")}
            {wrapInput("Trading Line", "creditPosition.tradingLine", "number")}
          </div>
        </div>
      );

    case 'financials_raroc':
      return (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="bg-tdgreen rounded-3xl p-10 text-white grid grid-cols-1 md:grid-cols-4 gap-8 shadow-2xl shadow-tdgreen/20">
            <div className="space-y-1">
               <span className="text-[10px] font-black uppercase text-tdgreen-light/80 tracking-widest">LCC Approval</span>
               <input 
                 className="bg-transparent text-white text-xl font-bold w-full outline-none border-b border-white/20 focus:border-white transition-all" 
                 value={getNested(data, 'financialInfo.raroc.lccStatus')} 
                 onChange={e => setNested('financialInfo.raroc.lccStatus', e.target.value)} 
               />
            </div>
            <div className="space-y-1">
               <span className="text-[10px] font-black uppercase text-tdgreen-light/80 tracking-widest">Econ RAROC %</span>
               <input 
                 type="number"
                 className="bg-transparent text-white text-4xl font-black w-full outline-none" 
                 value={getNested(data, 'financialInfo.raroc.economicRaroc')} 
                 onChange={e => setNested('financialInfo.raroc.economicRaroc', Number(e.target.value))} 
               />
            </div>
            <div className="space-y-1">
               <span className="text-[10px] font-black uppercase text-tdgreen-light/80 tracking-widest">Rel RAROC %</span>
               <input 
                 type="number"
                 className="bg-transparent text-white text-4xl font-black w-full outline-none" 
                 value={getNested(data, 'financialInfo.raroc.relationshipRaroc')} 
                 onChange={e => setNested('financialInfo.raroc.relationshipRaroc', Number(e.target.value))} 
               />
            </div>
            <div className="space-y-1">
               <span className="text-[10px] font-black uppercase text-tdgreen-light/80 tracking-widest">Econ Capital</span>
               <div className="flex items-center gap-1">
                 <span className="text-xl font-bold">$</span>
                 <input 
                   type="number"
                   className="bg-transparent text-white text-xl font-bold w-full outline-none" 
                   value={getNested(data, 'financialInfo.raroc.economicCapital')} 
                   onChange={e => setNested('financialInfo.raroc.economicCapital', Number(e.target.value))} 
                 />
               </div>
            </div>
          </div>
          <Header title="Review Dates" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {wrapInput("New Annual Review Date", "reviewDates.newAnnualDate", "date")}
            {wrapInput("Authorized Annual Date", "reviewDates.authorizedDate", "date")}
            {wrapInput("Interim Review Date", "reviewDates.interimDate", "date")}
          </div>
        </div>
      );

    case 'facility_info':
      return (
        <div className="space-y-10 animate-in fade-in duration-500">
          <Header title="Interest Rates & Fees" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {wrapInput("Applicable Margin", "facilityDetails.rates.margin")}
            {wrapInput("Facility Fee", "facilityDetails.rates.fee")}
            {wrapInput("All-in Drawn", "facilityDetails.rates.allIn")}
            {wrapInput("Upfront Fees", "facilityDetails.rates.upfront")}
          </div>

          <Header title="Terms & Renewal" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {wrapInput("Tenor", "facilityDetails.terms.tenor")}
            {wrapInput("Maturity Date", "facilityDetails.terms.maturity", "date")}
          </div>
        </div>
      );

    case 'analysis_narrative':
      return (
        <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-xl shadow-slate-200/10">
            <Header title="Borrower Overview" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
              {wrapTextArea("Company Description", "analysis.overview.companyDesc")}
              {wrapTextArea("Recent Events", "analysis.overview.recentEvents")}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            <Header title="Recommendation Summary" />
            <div className="p-8 bg-tdgreen rounded-[2.5rem] shadow-2xl shadow-tdgreen/10 text-white">
               {wrapTextArea("Executive Summary & Recommendation", "analysis.justification.recommendation", 8, "text-slate-800")}
            </div>
          </div>
        </div>
      );

    case 'document_preview':
      return (
        <div className="max-w-4xl mx-auto space-y-16 py-10 print:p-0 animate-in fade-in zoom-in-95 duration-700 pb-32">
          {/* Reuse the existing document_preview logic from previous files... */}
          <div className="text-center space-y-6 border-b-4 border-tdgreen pb-12">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-tdgreen text-white font-black text-3xl flex items-center justify-center rounded-xl shadow-xl shadow-tdgreen/20">TD</div>
            </div>
            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tight">Credit Application Memo</h1>
            <div className="flex justify-between items-end text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
              <span>Institution: TD Bank N.A.</span>
              <span>Ref ID: {getNested(data, 'primaryBorrower.borrowerName')?.slice(0, 3).toUpperCase() || 'LNX'}-{Math.floor(Math.random() * 9000) + 1000}</span>
              <span>Originating Office: {getNested(data, 'primaryBorrower.originatingOffice') || "N/A"}</span>
            </div>
          </div>

          <section className="space-y-6">
            <h2 className="text-2xl font-black bg-slate-900 text-white px-6 py-3 uppercase tracking-widest shadow-lg">1. Executive Summary & Recommendation</h2>
            <div className="prose prose-slate max-w-none">
              <div className="text-lg text-tdgreen font-bold italic border-l-8 border-tdgreen pl-8 py-6 bg-tdgreen-light/20 rounded-r-3xl whitespace-pre-wrap">
                {getNested(data, 'analysis.justification.recommendation') || "Synthesis pending."}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-black bg-slate-100 text-slate-900 px-6 py-3 uppercase tracking-widest border-l-[12px] border-tdgreen">2. Borrower Profile</h2>
            <div className="grid grid-cols-2 gap-x-16 gap-y-2">
              <PreviewRow label="Borrower Name" value={getNested(data, 'primaryBorrower.borrowerName')} />
              <PreviewRow label="Group" value={getNested(data, 'primaryBorrower.group')} />
              <PreviewRow label="Account Class" value={getNested(data, 'primaryBorrower.accountClassification')} />
              <PreviewRow label="Leveraged Lending" value={getNested(data, 'primaryBorrower.leveragedLending') ? 'Yes' : 'No'} />
            </div>
          </section>

          <footer className="text-center pt-32 opacity-30">
             <p className="text-[9px] font-black uppercase tracking-[1em] text-slate-400">TD Bank N.A. • Restricted • Confidential • Internal Use Only</p>
          </footer>
        </div>
      );

    default:
      return null;
  }
};

export default SectionRenderer;
