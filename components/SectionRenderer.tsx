
import React, { useState, useEffect } from 'react';
import { CreditMemoData, SectionKey, SourceFile, PublicRating } from '../types';

interface SectionRendererProps {
  section: SectionKey;
  data: CreditMemoData;
  files?: SourceFile[];
  onChange: (updates: Partial<CreditMemoData>) => void;
}

const MarkdownTable: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.trim().split('\n');
  const tableLines = lines.filter(l => l.includes('|'));
  
  if (tableLines.length < 2) return <div className="whitespace-pre-wrap">{content}</div>;

  const parseRow = (row: string) => {
    const cells = row.split('|');
    if (cells[0].trim() === '') cells.shift();
    if (cells[cells.length - 1].trim() === '') cells.pop();
    return cells.map(c => c.trim());
  };
  
  const rows = tableLines.filter(l => !l.match(/^[|:\s-]+$/)).map(parseRow);
  if (rows.length === 0) return null;
  
  const headers = rows[0];
  const body = rows.slice(1);

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map((h, i) => (
              <th key={i} className="p-3 text-[10px] font-black uppercase text-slate-500 tracking-widest border-r border-slate-100 last:border-0">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="p-3 text-sm font-bold text-slate-700 border-r border-slate-100 last:border-0">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SmartNarrative: React.FC<{ text: string, files?: SourceFile[] }> = ({ text, files = [] }) => {
  if (!text) return null;
  const parts = text.split(/(\n(?:\|.+?\|(?:\n|$))+|\!\[.+?\]\(.+?\))/g);
  return (
    <div className="space-y-4">
      {parts.map((part, i) => {
        if (!part.trim()) return null;
        if (part.trim().startsWith('|')) return <MarkdownTable key={i} content={part} />;
        const imageMatch = part.match(/\!\[(.+?)\]\((.+?)\)/);
        if (imageMatch) {
          const alt = imageMatch[1];
          const filename = imageMatch[2];
          const file = files.find(f => f.name.toLowerCase() === filename.toLowerCase());
          if (file) {
            const isImage = file.type.startsWith('image/');
            return (
              <div key={i} className="my-6 space-y-2">
                <div className="text-[9px] font-black text-tdgreen uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-tdgreen animate-pulse"></span>
                  Attachment: {alt} ({filename})
                </div>
                {isImage ? (
                  <img src={file.dataUrl} alt={alt} className="max-w-full rounded-2xl border border-slate-200 shadow-lg" />
                ) : (
                  <div className="p-6 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">📕</div>
                      <div>
                        <p className="text-xs font-black text-slate-800">{alt}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{filename}</p>
                      </div>
                    </div>
                    <button className="text-[9px] font-black text-tdgreen uppercase tracking-[0.2em] border border-tdgreen/20 px-4 py-2 rounded-xl hover:bg-tdgreen/5 transition-all">
                      Open PDF Exhibit
                    </button>
                  </div>
                )}
              </div>
            );
          }
          return <div key={i} className="text-[10px] text-rose-500 font-bold italic border-l-2 border-rose-200 pl-3 my-2">[Image Reference Missing: {filename}]</div>;
        }
        return <div key={i} className="whitespace-pre-wrap leading-relaxed">{part}</div>;
      })}
    </div>
  );
};

const getNested = (obj: any, path: string) => path.split('.').reduce((o, i) => (o && typeof o === 'object' ? o[i] : undefined), obj) ?? '';

const SourceBadge: React.FC<{ filename?: string }> = ({ filename }) => {
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

const Input: React.FC<{ label: string, value: any, onChange: (val: any) => void, source?: string, type?: string, placeholder?: string }> = ({ label, value, onChange, source, type = "text", placeholder = "" }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <div className="flex items-center">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <SourceBadge filename={source} />
      </div>
    </div>
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        className={`w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-4 focus:ring-tdgreen/10 focus:border-tdgreen outline-none transition-all shadow-sm font-medium text-sm ${source ? 'ring-2 ring-tdgreen/5 border-tdgreen/30' : ''}`}
      />
    </div>
  </div>
);

const TextArea: React.FC<{ label: string, value: string, onChange: (val: string) => void, source?: string, rows?: number, className?: string }> = ({ label, value, onChange, source, rows = 4, className = "" }) => (
  <div className={`space-y-1.5 ${className}`}>
    <div className="flex justify-between items-center">
      <div className="flex items-center">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <SourceBadge filename={source} />
      </div>
    </div>
    <div className="relative">
      <textarea
        rows={rows}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-4 focus:ring-tdgreen/10 focus:border-tdgreen outline-none transition-all resize-none shadow-sm text-sm leading-relaxed ${source ? 'ring-2 ring-tdgreen/5 border-tdgreen/30' : ''}`}
      />
    </div>
  </div>
);

const SectionRenderer: React.FC<SectionRendererProps> = ({ section, data, files = [], onChange }) => {
  const [selectedFile, setSelectedFile] = useState<SourceFile | null>(null);
  const [openaiKeyInput, setOpenaiKeyInput] = useState(localStorage.getItem('MAPLE_OPENAI_API_KEY') || '');

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

  const wrapInput = (label: string, path: string, type = "text") => <Input label={label} value={getNested(data, path)} source={data.fieldSources?.[path]} onChange={(val) => setNested(path, val)} type={type} />;
  const wrapTextArea = (label: string, path: string, rows = 4, className = "") => <TextArea label={label} value={getNested(data, path)} source={data.fieldSources?.[path]} onChange={(val) => setNested(path, val)} rows={rows} className={className} />;
  const wrapCheckbox = (label: string, path: string) => (
    <label className="flex items-center gap-4 p-5 rounded-xl border border-slate-100 hover:border-tdgreen/20 hover:bg-tdgreen-light/30 cursor-pointer transition-all shadow-sm bg-white group">
      <input type="checkbox" checked={!!getNested(data, path)} onChange={(e) => setNested(path, e.target.checked)} className="w-6 h-6 text-tdgreen rounded-lg border-slate-300 focus:ring-tdgreen transition-all" />
      <div className="flex flex-col">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        {data.fieldSources?.[path] && <span className="text-[8px] font-black text-tdgreen uppercase tracking-widest mt-1">Source: {data.fieldSources[path]}</span>}
      </div>
    </label>
  );

  const PreviewRow = ({ label, value }: { label: string, value: any }) => (
    <div className="flex border-b border-slate-50 py-3 text-sm">
      <span className="w-1/3 text-slate-400 font-bold uppercase tracking-[0.1em] text-[10px]">{label}:</span>
      <span className="w-2/3 font-black text-slate-800 break-words">{value === true ? "YES" : value === false ? "NO" : (value || "N/A")}</span>
    </div>
  );

  const PreviewTextArea = ({ label, value }: { label: string, value: string }) => !value ? null : (
    <div className="py-6">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-l-4 border-tdgreen pl-3">{label}</div>
      <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
        <SmartNarrative text={value} files={files} />
      </div>
    </div>
  );

  const PreviewHeader = ({ title }: { title: string }) => <h2 className="text-xl font-black bg-slate-900 text-white px-6 py-3 uppercase tracking-widest mb-4 mt-8 first:mt-0">{title}</h2>;
  const Header = ({ title }: { title: string }) => <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 pb-3 mt-4 mb-4 col-span-full">{title}</h3>;

  const handleRatingChange = (index: number, field: keyof PublicRating, value: string) => {
    const updatedRatings = [...data.riskAssessment.publicRatings];
    updatedRatings[index] = { ...updatedRatings[index], [field]: value };
    setNested('riskAssessment.publicRatings', updatedRatings);
  };

  if (section === 'settings') {
    return (
      <div className="space-y-10 animate-in fade-in duration-700">
        <div className="p-8 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-tdgreen/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          <div className="flex items-center gap-4 mb-10 relative z-10">
            <div className="w-14 h-14 bg-tdgreen rounded-2xl flex items-center justify-center text-3xl">⚙️</div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">System Configuration</h3>
              <p className="text-slate-400 text-sm">Manage API endpoints and overrides.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs bg-tdgreen/20 text-tdgreen">G</div>
                  <div><p className="text-xs font-black text-slate-200">Gemini API (Primary)</p><code className="text-[9px] text-slate-500">process.env.API_KEY</code></div>
                </div>
                <div className={`w-2 h-2 rounded-full ${process.env.API_KEY ? 'bg-tdgreen animate-pulse' : 'bg-rose-500'}`}></div>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs bg-blue-500/20 text-blue-400">O</div>
                  <div><p className="text-xs font-black text-slate-200">OpenAI API (Optional)</p><code className="text-[9px] text-slate-500">localStorage Override</code></div>
                </div>
                <div className={`w-2 h-2 rounded-full ${(getNested(process, `env.OPENAI_API_KEY`) || localStorage.getItem('MAPLE_OPENAI_API_KEY')) ? 'bg-blue-500 animate-pulse' : 'bg-rose-500'}`}></div>
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">Update OpenAI Key</h4>
              <p className="text-[10px] text-slate-400 mb-4 leading-relaxed italic">Store your OpenAI key in localStorage for session persistence.</p>
              <input 
                type="password" 
                placeholder="sk-..." 
                value={openaiKeyInput} 
                onChange={e => setOpenaiKeyInput(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-300 mb-4 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
              <button 
                onClick={() => { 
                  localStorage.setItem('MAPLE_OPENAI_API_KEY', openaiKeyInput); 
                  alert("OpenAI Key saved successfully.");
                  window.location.reload(); 
                }} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'source_documents') {
    return (
      <div className="h-full flex flex-col gap-8 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {files.map(file => (
              <button key={file.id} onClick={() => setSelectedFile(file)} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all ${selectedFile?.id === file.id ? 'bg-tdgreen border-tdgreen text-white shadow-xl' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${selectedFile?.id === file.id ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>{file.type.includes('pdf') ? '📕' : '📄'}</div>
                <div className="text-left flex-1 min-w-0"><p className="font-black truncate text-sm">{file.name}</p><p className="text-[10px] opacity-60 uppercase tracking-widest mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div>
              </button>
            ))}
          </div>
          <div className="bg-slate-100 rounded-[2rem] border border-slate-200 overflow-hidden min-h-[500px] flex items-center justify-center">
            {selectedFile ? <embed src={selectedFile.dataUrl} width="100%" height="100%" /> : <p className="text-slate-400 font-black uppercase tracking-widest">Select document to preview</p>}
          </div>
        </div>
      </div>
    );
  }

  if (section === 'document_preview') {
    return (
      <div className="max-w-4xl mx-auto space-y-12 py-10 print:p-0 relative">
        <div className="border-b-8 border-tdgreen pb-10 text-center">
          <div className="inline-block px-4 py-2 bg-slate-900 text-white font-black text-xs uppercase mb-4">Confidential</div>
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Credit Memo</h1>
          <p className="text-slate-500 font-bold mt-2 text-sm uppercase">Institutional Banking • Syndicate Credit</p>
        </div>
        <section><PreviewHeader title="1. Recommendation" /><PreviewTextArea label="Summary" value={getNested(data, 'analysis.justification.recommendation')} /></section>
        <section>
          <PreviewHeader title="2. Borrower" />
          <div className="grid grid-cols-2 gap-x-12 px-2">
            <PreviewRow label="Name" value={getNested(data, 'primaryBorrower.borrowerName')} />
            <PreviewRow label="Group" value={getNested(data, 'primaryBorrower.group')} />
            <PreviewRow label="Originating Office" value={getNested(data, 'primaryBorrower.originatingOffice')} />
            <PreviewRow label="Classification" value={getNested(data, 'primaryBorrower.accountClassification')} />
          </div>
        </section>
        <section>
          <PreviewHeader title="3. Facility Details" />
          <div className="grid grid-cols-2 gap-x-12 px-2">
            <PreviewRow label="Margin" value={getNested(data, 'facilityDetails.rates.margin')} />
            <PreviewRow label="Tenor" value={getNested(data, 'facilityDetails.terms.tenor')} />
            <PreviewRow label="Maturity" value={getNested(data, 'facilityDetails.terms.maturity')} />
            <PreviewRow label="Fee" value={getNested(data, 'facilityDetails.rates.fee')} />
          </div>
        </section>
        <section>
          <PreviewHeader title="4. Legal & Covenants" />
          <div className="px-2 space-y-4">
            <PreviewRow label="Agreement Type" value={getNested(data, 'documentation.agreementType')} />
            <PreviewRow label="Jurisdiction" value={getNested(data, 'documentation.jurisdiction')} />
            <PreviewTextArea label="Financial Covenants" value={getNested(data, 'documentation.financialCovenants')} />
            <PreviewTextArea label="Negative Covenants" value={getNested(data, 'documentation.negativeCovenants')} />
            <PreviewTextArea label="Positive Covenants" value={getNested(data, 'documentation.positiveCovenants')} />
            <PreviewTextArea label="Reporting Requirements" value={getNested(data, 'documentation.reportingReqs')} />
            <PreviewTextArea label="Funding Conditions" value={getNested(data, 'documentation.fundingConditions')} />
          </div>
        </section>
        <section>
          <PreviewHeader title="5. Risk & Ratings" />
          <div className="px-2 space-y-8">
            <Header title="Borrower Rating" />
            <div className="grid grid-cols-2 gap-x-12">
               <PreviewRow label="Proposed BRR" value={getNested(data, 'riskAssessment.borrowerRating.proposedBrr')} />
               <PreviewRow label="Current BRR" value={getNested(data, 'riskAssessment.borrowerRating.currentBrr')} />
               <PreviewRow label="Risk Analyst" value={getNested(data, 'riskAssessment.borrowerRating.riskAnalyst')} />
               <PreviewRow label="New RA / Policy" value={getNested(data, 'riskAssessment.borrowerRating.newRaPolicy')} />
               <PreviewRow label="RA / Policy Model" value={getNested(data, 'riskAssessment.borrowerRating.raPolicyModel')} />
            </div>
            <Header title="Agency Ratings" />
            <div className="overflow-hidden rounded-xl border border-slate-200">
               <table className="w-full text-left border-collapse text-xs">
                 <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Agency</th>
                      <th className="p-3 font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Issuer Rating</th>
                      <th className="p-3 font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Senior Unsecured</th>
                      <th className="p-3 font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Outlook</th>
                      <th className="p-3 font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Last Updated</th>
                    </tr>
                 </thead>
                 <tbody>
                    {data.riskAssessment.publicRatings.map((rating, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 font-bold">
                        <td className="p-3 text-slate-900">{rating.agency}</td>
                        <td className="p-3 text-slate-700">{rating.issuerRating || "N/A"}</td>
                        <td className="p-3 text-slate-700">{rating.seniorUnsecured || "N/A"}</td>
                        <td className="p-3 text-slate-700">{rating.outlook || "N/A"}</td>
                        <td className="p-3 text-slate-400 italic">{rating.updatedAt || "N/A"}</td>
                      </tr>
                    ))}
                 </tbody>
               </table>
            </div>
          </div>
        </section>
        <section><PreviewHeader title="6. Analysis" /><PreviewTextArea label="Company Overview" value={getNested(data, 'analysis.overview.companyDesc')} /></section>
      </div>
    );
  }

  switch (section) {
    case 'borrower_details':
      return (
        <div className="grid grid-cols-2 gap-8">
          {wrapInput("Borrower Name", "primaryBorrower.borrowerName")}
          {wrapInput("Group", "primaryBorrower.group")}
          {wrapInput("Originating Office", "primaryBorrower.originatingOffice")}
          {wrapInput("Account Classification", "primaryBorrower.accountClassification")}
          <Header title="Policy & Status" />
          <div className="col-span-full grid grid-cols-3 gap-5">
            {wrapCheckbox("Quarterly Review", "primaryBorrower.quarterlyReview")}
            {wrapCheckbox("Leveraged", "primaryBorrower.leveragedLending")}
            {wrapCheckbox("Strategic", "primaryBorrower.strategicLoan")}
            {wrapCheckbox("Credit Exception", "primaryBorrower.creditException")}
            {wrapCheckbox("Covenant Lite", "primaryBorrower.covenantLite")}
          </div>
        </div>
      );
    case 'purpose':
      return (
        <div className="space-y-8">
          {wrapTextArea("Business Purpose", "purpose.businessPurpose")}
          {wrapTextArea("Adjudication Considerations", "purpose.adjudicationConsiderations")}
          {wrapInput("Annual Review Status", "purpose.annualReviewStatus")}
        </div>
      );
    case 'credit_exposure':
      return (
        <div className="grid grid-cols-3 gap-6">
          {wrapInput("Requested", "creditPosition.creditRequested", "number")}
          {wrapInput("Present Position", "creditPosition.presentPosition", "number")}
          {wrapInput("Previous Auth", "creditPosition.previousAuthorization", "number")}
          {wrapInput("Trading Line", "creditPosition.tradingLine", "number")}
          {wrapInput("Committed > 1yr", "creditPosition.committedOverOneYear", "number")}
        </div>
      );
    case 'financials_raroc':
      return (
        <div className="space-y-10">
          <div className="bg-tdgreen rounded-3xl p-10 text-white grid grid-cols-2 gap-8 shadow-xl shadow-tdgreen/10">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Economic RAROC %</span>
              <input type="number" className="bg-transparent text-white text-4xl font-black w-full outline-none mt-2" value={getNested(data, 'financialInfo.raroc.economicRaroc')} onChange={e => setNested('financialInfo.raroc.economicRaroc', Number(e.target.value))} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Relationship RAROC %</span>
              <input type="number" className="bg-transparent text-white text-4xl font-black w-full outline-none mt-2" value={getNested(data, 'financialInfo.raroc.relationshipRaroc')} onChange={e => setNested('financialInfo.raroc.relationshipRaroc', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
             {wrapInput("LCC Status", "financialInfo.raroc.lccStatus")}
             {wrapInput("Economic Capital", "financialInfo.raroc.economicCapital", "number")}
          </div>
        </div>
      );
    case 'risk_ratings':
      return (
        <div className="space-y-12">
          <Header title="Borrower Rating" />
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {wrapInput("TD BRR Proposed", "riskAssessment.borrowerRating.proposedBrr")}
            {wrapInput("TD BRR Current", "riskAssessment.borrowerRating.currentBrr")}
            {wrapInput("Risk Analyst", "riskAssessment.borrowerRating.riskAnalyst")}
            {wrapInput("New RA / Policy", "riskAssessment.borrowerRating.newRaPolicy")}
            {wrapInput("RA / Policy Model", "riskAssessment.borrowerRating.raPolicyModel")}
          </div>
          <Header title="Agency Rating" />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Agency</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Issuer Rating</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Senior Unsecured Notes</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Outlook</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.riskAssessment.publicRatings.map((rating, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-all">
                    <td className="p-4 font-black text-slate-800 text-sm">{rating.agency}</td>
                    <td className="p-2">
                      <input type="text" value={rating.issuerRating || ''} onChange={(e) => handleRatingChange(i, 'issuerRating', e.target.value)} placeholder="Rating" className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-tdgreen focus:bg-white rounded-lg outline-none transition-all font-bold text-sm text-slate-700" />
                    </td>
                    <td className="p-2">
                      <input type="text" value={rating.seniorUnsecured || ''} onChange={(e) => handleRatingChange(i, 'seniorUnsecured', e.target.value)} placeholder="Notes" className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-tdgreen focus:bg-white rounded-lg outline-none transition-all font-bold text-sm text-slate-700" />
                    </td>
                    <td className="p-2">
                      <input type="text" value={rating.outlook || ''} onChange={(e) => handleRatingChange(i, 'outlook', e.target.value)} placeholder="Outlook" className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-tdgreen focus:bg-white rounded-lg outline-none transition-all font-bold text-sm text-slate-700" />
                    </td>
                    <td className="p-2">
                      <input type="text" value={rating.updatedAt || ''} onChange={(e) => handleRatingChange(i, 'updatedAt', e.target.value)} placeholder="Date" className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-tdgreen focus:bg-white rounded-lg outline-none transition-all font-bold text-sm text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Header title="Additional Risk Details" />
          <div className="grid grid-cols-2 gap-8">
            {wrapInput("TD SIC Code", "riskAssessment.details.tdSic")}
            {wrapInput("Industry Risk", "riskAssessment.details.industryRisk")}
            {wrapInput("Business Risk", "riskAssessment.details.businessRisk")}
            {wrapInput("Financial Risk", "riskAssessment.details.financialRisk")}
            {wrapInput("Security", "riskAssessment.details.security")}
            {wrapInput("LTV %", "riskAssessment.details.ltv", "number")}
          </div>
        </div>
      );
    case 'facility_info':
      return (
        <div className="space-y-10">
           <Header title="Pricing" />
           <div className="grid grid-cols-4 gap-6">
             {wrapInput("Margin", "facilityDetails.rates.margin")}
             {wrapInput("Fee", "facilityDetails.rates.fee")}
             {wrapInput("All-In", "facilityDetails.rates.allIn")}
             {wrapInput("Upfront", "facilityDetails.rates.upfront")}
           </div>
           <Header title="Terms" />
           <div className="grid grid-cols-3 gap-6">
             {wrapInput("Tenor", "facilityDetails.terms.tenor")}
             {wrapInput("Maturity", "facilityDetails.terms.maturity")}
             {wrapInput("Extension", "facilityDetails.terms.extension")}
           </div>
        </div>
      );
    case 'documentation_covenants':
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-8">
            {wrapInput("Agreement Type", "documentation.agreementType")}
            {wrapInput("Jurisdiction", "documentation.jurisdiction")}
          </div>
          {wrapTextArea("Financial Covenants", "documentation.financialCovenants")}
          {wrapTextArea("Negative Covenants", "documentation.negativeCovenants")}
          {wrapTextArea("Positive Covenants", "documentation.positiveCovenants")}
          {wrapTextArea("Reporting Requirements", "documentation.reportingReqs")}
          {wrapTextArea("Funding Conditions", "documentation.fundingConditions")}
        </div>
      );
    case 'analysis_narrative':
      return (
        <div className="space-y-12">
          <Header title="Executive Summary & Recommendation" />
          <div className="p-8 bg-tdgreen/5 rounded-[2rem] border-2 border-tdgreen/10">
            {wrapTextArea("Narrative Summary", "analysis.justification.recommendation", 12)}
          </div>
          <Header title="Overview" />
          {wrapTextArea("Company Overview", "analysis.overview.companyDesc", 6)}
        </div>
      );
    default:
      return null;
  }
};

export default SectionRenderer;
