
import React, { useState } from 'react';
import { CreditMemoData, SectionKey, SourceFile, PublicRating } from '../types';

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

  const PreviewRow = ({ label, value }: { label: string, value: any }) => {
    const displayValue = value === true ? "YES" : value === false ? "NO" : (value || "N/A");
    return (
      <div className="flex border-b border-slate-50 py-3 text-sm">
        <span className="w-1/3 text-slate-400 font-bold uppercase tracking-[0.1em] text-[10px]">{label}:</span>
        <span className="w-2/3 font-black text-slate-800 break-words">{displayValue}</span>
      </div>
    );
  };

  const PreviewTextArea = ({ label, value }: { label: string, value: string }) => {
    if (!value) return null;
    return (
      <div className="py-4">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</div>
        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
          {value}
        </div>
      </div>
    );
  };

  const PreviewHeader = ({ title }: { title: string }) => (
    <h2 className="text-xl font-black bg-slate-900 text-white px-6 py-3 uppercase tracking-widest mb-4 mt-8 first:mt-0">
      {title}
    </h2>
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
                  <a href={selectedFile.dataUrl} download={selectedFile.name} className="text-tdgreen hover:text-tdgreen-dark text-[10px] font-black uppercase tracking-widest">Download</a>
                </div>
                <div className="flex-1 overflow-hidden">
                   <embed src={selectedFile.dataUrl} width="100%" height="100%" />
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center text-slate-400">
                <div className="text-6xl mb-6 opacity-20">📂</div>
                <p className="text-sm font-black uppercase tracking-widest">Select a document to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
          <div className="col-span-full mt-6">
            {wrapTextArea("Additional Comments", "primaryBorrower.additionalComments")}
          </div>
        </div>
      );

    case 'purpose':
      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          {wrapTextArea("Business Purpose", "purpose.businessPurpose")}
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
          {wrapTextArea("Additional Comments", "purpose.additionalComments")}
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
          {wrapTextArea("Additional Comments", "creditPosition.additionalComments")}
        </div>
      );

    case 'financials_raroc':
      return (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="bg-tdgreen rounded-3xl p-10 text-white grid grid-cols-1 md:grid-cols-4 gap-8 shadow-2xl shadow-tdgreen/20">
            <div className="space-y-1">
               <span className="text-[10px] font-black uppercase text-tdgreen-light/80 tracking-widest">LCC Approval</span>
               <input className="bg-transparent text-white text-xl font-bold w-full outline-none border-b border-white/20" value={getNested(data, 'financialInfo.raroc.lccStatus')} onChange={e => setNested('financialInfo.raroc.lccStatus', e.target.value)} />
            </div>
            <div className="space-y-1">
               <span className="text-[10px] font-black uppercase text-tdgreen-light/80 tracking-widest">Econ RAROC %</span>
               <input type="number" className="bg-transparent text-white text-4xl font-black w-full outline-none" value={getNested(data, 'financialInfo.raroc.economicRaroc')} onChange={e => setNested('financialInfo.raroc.economicRaroc', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
               <span className="text-[10px] font-black uppercase text-tdgreen-light/80 tracking-widest">Rel RAROC %</span>
               <input type="number" className="bg-transparent text-white text-4xl font-black w-full outline-none" value={getNested(data, 'financialInfo.raroc.relationshipRaroc')} onChange={e => setNested('financialInfo.raroc.relationshipRaroc', Number(e.target.value))} />
            </div>
          </div>
          <Header title="Review Dates" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {wrapInput("New Annual Date", "reviewDates.newAnnualDate", "date")}
            {wrapInput("Authorized Date", "reviewDates.authorizedDate", "date")}
          </div>
          {wrapTextArea("Additional Comments", "financialInfo.additionalComments")}
        </div>
      );

    case 'risk_ratings':
      return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-6">
            <Header title="Borrower Rating" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wrapInput("TD BRR proposed", "riskAssessment.borrowerRating.proposedBrr")}
              {wrapInput("TD BRR current", "riskAssessment.borrowerRating.currentBrr")}
              {wrapInput("Risk Analyst", "riskAssessment.borrowerRating.riskAnalyst")}
              {wrapInput("New RA / Policy", "riskAssessment.borrowerRating.newRaPolicy")}
              {wrapInput("RA/ Policy Model", "riskAssessment.borrowerRating.raPolicyModel")}
            </div>
          </div>

          <div className="space-y-6">
            <Header title="Agency Rating" />
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agency</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Issuer Rating</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Senior Unsecured Notes</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Outlook</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.riskAssessment.publicRatings.map((rating: PublicRating, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-black text-slate-700 text-sm">{rating.agency}</td>
                      <td className="p-2">
                        <input 
                          className="w-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-tdgreen/20 rounded-lg text-sm font-medium outline-none" 
                          value={rating.issuerRating} 
                          placeholder="e.g. Baa1"
                          onChange={(e) => {
                            const newRatings = [...data.riskAssessment.publicRatings];
                            newRatings[idx].issuerRating = e.target.value;
                            setNested('riskAssessment.publicRatings', newRatings);
                          }} 
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          className="w-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-tdgreen/20 rounded-lg text-sm font-medium outline-none" 
                          value={rating.seniorUnsecured} 
                          placeholder="e.g. A3"
                          onChange={(e) => {
                            const newRatings = [...data.riskAssessment.publicRatings];
                            newRatings[idx].seniorUnsecured = e.target.value;
                            setNested('riskAssessment.publicRatings', newRatings);
                          }} 
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          className="w-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-tdgreen/20 rounded-lg text-sm font-medium outline-none" 
                          value={rating.outlook} 
                          placeholder="Stable"
                          onChange={(e) => {
                            const newRatings = [...data.riskAssessment.publicRatings];
                            newRatings[idx].outlook = e.target.value;
                            setNested('riskAssessment.publicRatings', newRatings);
                          }} 
                        />
                      </td>
                      <td className="p-2 text-sm text-slate-500">
                        <input 
                          type="date"
                          className="w-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-tdgreen/20 rounded-lg text-sm font-medium outline-none" 
                          value={rating.updatedAt} 
                          onChange={(e) => {
                            const newRatings = [...data.riskAssessment.publicRatings];
                            newRatings[idx].updatedAt = e.target.value;
                            setNested('riskAssessment.publicRatings', newRatings);
                          }} 
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {wrapTextArea("Additional Comments", "riskAssessment.additionalComments")}
        </div>
      );

    case 'facility_info':
      return (
        <div className="space-y-10 animate-in fade-in duration-500">
          <Header title="Pricing" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {wrapInput("Margin", "facilityDetails.rates.margin")}
            {wrapInput("Fee", "facilityDetails.rates.fee")}
            {wrapInput("All-In", "facilityDetails.rates.allIn")}
            {wrapInput("Upfront", "facilityDetails.rates.upfront")}
          </div>
          <Header title="Terms" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {wrapInput("Tenor", "facilityDetails.terms.tenor")}
            {wrapInput("Maturity", "facilityDetails.terms.maturity", "date")}
            {wrapInput("Extension Option", "facilityDetails.terms.extension")}
            {wrapInput("Term Out", "facilityDetails.terms.termOut")}
          </div>
          <Header title="Repayment & Prepayment" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {wrapCheckbox("Amortizing", "facilityDetails.repayment.amortizing")}
            {wrapCheckbox("Prepayment Permitted", "facilityDetails.prepayment.permitted")}
            {wrapTextArea("Repayment Comments", "facilityDetails.repayment.comments")}
            {wrapTextArea("Prepayment Comments", "facilityDetails.prepayment.comments")}
          </div>
          {wrapTextArea("Additional Comments", "facilityDetails.additionalComments")}
        </div>
      );

    case 'documentation_covenants':
      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {wrapInput("Agreement Type", "documentation.agreementType")}
            {wrapInput("Agreement Date", "documentation.date", "date")}
            {wrapInput("Status", "documentation.status")}
            {wrapInput("Jurisdiction", "documentation.jurisdiction")}
            {wrapTextArea("Amendments", "documentation.amendments", 2)}
          </div>
          
          <Header title="Covenants" />
          <div className="space-y-6">
            {wrapTextArea("Negative Covenants", "documentation.negativeCovenants")}
            {wrapTextArea("Positive Covenants", "documentation.positiveCovenants")}
            {wrapTextArea("Financial Covenants", "documentation.financialCovenants")}
            {wrapTextArea("Events of Default", "documentation.eventsOfDefault")}
          </div>

          <Header title="Reporting & Funding" />
          <div className="space-y-6">
            {wrapTextArea("Reporting Requirements", "documentation.reportingReqs")}
            {wrapTextArea("Funding Conditions", "documentation.fundingConditions")}
          </div>

          <Header title="Other Legal Terms" />
          <div className="space-y-6">
             {wrapCheckbox("Waiver of Jury Trial", "documentation.waiverJuryTrial")}
             {wrapTextArea("Additional Comments", "documentation.additionalComments")}
          </div>
        </div>
      );

    case 'analysis_narrative':
      return (
        <div className="space-y-12 animate-in fade-in duration-700">
          <Header title="Overview" />
          {wrapTextArea("Borrower Overview", "analysis.overview.companyDesc")}
          {wrapTextArea("Recent Events", "analysis.overview.recentEvents")}
          {wrapTextArea("Sources & Uses", "analysis.overview.sourcesUses")}
          {wrapTextArea("Financing Plan", "analysis.overview.financingPlan")}
          
          <Header title="Financial Analysis" />
          {wrapTextArea("Ratio Analysis", "analysis.financial.ratioAnalysis")}
          {wrapTextArea("Capital Structure", "analysis.financial.capStructure")}
          {wrapTextArea("Liquidity", "analysis.financial.liquidity")}
          {wrapTextArea("Debt Maturity Profile", "analysis.financial.debtMaturity")}

          <div className="p-8 bg-tdgreen rounded-[2rem] text-white">
             {wrapTextArea("Recommendation Summary", "analysis.justification.recommendation", 8, "text-slate-800")}
          </div>
          {wrapTextArea("Additional Comments", "analysis.additionalComments")}
        </div>
      );

    case 'compliance_signoff':
      return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {wrapInput("Signatory Name", "compliance.signOff.name")}
            {wrapInput("Signatory Title", "compliance.signOff.title")}
            {wrapInput("Signatory Date", "compliance.signOff.date", "date")}
            {wrapInput("Approver", "compliance.signOff.approver")}
          </div>
          <Header title="Legal Declarations" />
          <div className="space-y-4">
            {wrapTextArea("Declaration of Interest", "compliance.legal.declarationInterest")}
            {wrapTextArea("Directors Information", "compliance.legal.directors")}
            {wrapTextArea("Illegal Tying Disclosure", "compliance.legal.illegalTying")}
          </div>
          {wrapTextArea("Additional Comments", "compliance.additionalComments")}
        </div>
      );

    case 'document_preview':
      return (
        <div className="max-w-4xl mx-auto space-y-12 py-10 print:p-0 relative">
          {/* Header Branding */}
          <div className="border-b-8 border-tdgreen pb-10 text-center">
            <div className="inline-block px-4 py-2 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.3em] mb-4">Confidential</div>
            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Credit Memo Application</h1>
            <p className="text-slate-500 font-bold mt-2 text-sm uppercase tracking-widest">TD Institutional Banking • Syndicate Credit</p>
          </div>

          {/* 1. Executive Recommendation */}
          <section className="space-y-4">
            <PreviewHeader title="1. Executive Recommendation" />
            <div className="p-8 bg-slate-50 border-l-4 border-tdgreen italic text-lg leading-relaxed text-slate-800">
              {getNested(data, 'analysis.justification.recommendation') || "Recommendation pending analysis."}
            </div>
            <PreviewTextArea label="Analyst Recommendation Narrative" value={getNested(data, 'analysis.additionalComments')} />
          </section>

          {/* 2. Borrower Details */}
          <section className="space-y-4">
            <PreviewHeader title="2. Borrower Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 px-2">
              <PreviewRow label="Legal Name" value={getNested(data, 'primaryBorrower.borrowerName')} />
              <PreviewRow label="Originating Office" value={getNested(data, 'primaryBorrower.originatingOffice')} />
              <PreviewRow label="Group" value={getNested(data, 'primaryBorrower.group')} />
              <PreviewRow label="Account Class" value={getNested(data, 'primaryBorrower.accountClassification')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <PreviewRow label="Quarterly Review" value={getNested(data, 'primaryBorrower.quarterlyReview')} />
              <PreviewRow label="Leveraged Lending" value={getNested(data, 'primaryBorrower.leveragedLending')} />
              <PreviewRow label="Strategic Loan" value={getNested(data, 'primaryBorrower.strategicLoan')} />
              <PreviewRow label="Credit Exception" value={getNested(data, 'primaryBorrower.creditException')} />
              <PreviewRow label="Covenant-Lite" value={getNested(data, 'primaryBorrower.covenantLite')} />
              <PreviewRow label="Weak Underwriting" value={getNested(data, 'primaryBorrower.weakUnderwriting')} />
            </div>
            <PreviewTextArea label="Borrower Narrative" value={getNested(data, 'primaryBorrower.additionalComments')} />
          </section>

          {/* 3. Purpose & Adjudication */}
          <section className="space-y-4">
            <PreviewHeader title="3. Purpose & Adjudication" />
            <PreviewTextArea label="Business Purpose" value={getNested(data, 'purpose.businessPurpose')} />
            <PreviewTextArea label="Adjudication Considerations" value={getNested(data, 'purpose.adjudicationConsiderations')} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 px-2">
              <PreviewRow label="Annual Review Status" value={getNested(data, 'purpose.annualReviewStatus')} />
              <div className="flex flex-col gap-1 py-2">
                <span className="text-slate-400 font-bold uppercase tracking-[0.1em] text-[10px]">Review Purposes:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {getNested(data, 'purpose.reviewPurpose.newFacilities') && <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-black uppercase">New Facilities</span>}
                  {getNested(data, 'purpose.reviewPurpose.financialCovenants') && <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-black uppercase">Financial Covenants</span>}
                  {getNested(data, 'purpose.reviewPurpose.maturityDates') && <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-black uppercase">Maturity Dates</span>}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Credit Position */}
          <section className="space-y-4">
            <PreviewHeader title="4. Credit Position" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 px-2">
              <PreviewRow label="Credit Requested" value={getNested(data, 'creditPosition.creditRequested')?.toLocaleString()} />
              <PreviewRow label="Present Position" value={getNested(data, 'creditPosition.presentPosition')?.toLocaleString()} />
              <PreviewRow label="Prev. Authorized" value={getNested(data, 'creditPosition.previousAuthorization')?.toLocaleString()} />
              <PreviewRow label="Committed > 1 Year" value={getNested(data, 'creditPosition.committedOverOneYear')?.toLocaleString()} />
              <PreviewRow label="Total Excl. Trading" value={getNested(data, 'creditPosition.totalExcludingTrading')?.toLocaleString()} />
              <PreviewRow label="Trading Line" value={getNested(data, 'creditPosition.tradingLine')?.toLocaleString()} />
            </div>
            <PreviewTextArea label="Exposure Comments" value={getNested(data, 'creditPosition.additionalComments')} />
          </section>

          {/* 5. Financials & Profitability */}
          <section className="space-y-4">
            <PreviewHeader title="5. Financials & Profitability" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-900 text-white p-6 rounded-2xl">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Econ RAROC</div>
                <div className="text-2xl font-black">{getNested(data, 'financialInfo.raroc.economicRaroc')}%</div>
              </div>
              <div className="text-center border-x border-white/10">
                <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Relationship RAROC</div>
                <div className="text-2xl font-black">{getNested(data, 'financialInfo.raroc.relationshipRaroc')}%</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">LCC Status</div>
                <div className="text-lg font-black">{getNested(data, 'financialInfo.raroc.lccStatus') || "Pending"}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 px-2 mt-4">
               <PreviewRow label="New Annual Date" value={getNested(data, 'reviewDates.newAnnualDate')} />
               <PreviewRow label="Authorized Date" value={getNested(data, 'reviewDates.authorizedDate')} />
            </div>
            <PreviewTextArea label="Profitability Comments" value={getNested(data, 'financialInfo.additionalComments')} />
          </section>

          {/* 6. Risk Assessment */}
          <section className="space-y-4">
            <PreviewHeader title="6. Risk Assessment" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 px-2">
              <PreviewRow label="Proposed BRR" value={getNested(data, 'riskAssessment.borrowerRating.proposedBrr')} />
              <PreviewRow label="Current BRR" value={getNested(data, 'riskAssessment.borrowerRating.currentBrr')} />
              <PreviewRow label="RA / Policy" value={getNested(data, 'riskAssessment.borrowerRating.newRaPolicy')} />
              <PreviewRow label="RA Model" value={getNested(data, 'riskAssessment.borrowerRating.raPolicyModel')} />
              <PreviewRow label="Analyst" value={getNested(data, 'riskAssessment.borrowerRating.riskAnalyst')} />
            </div>
            
            <div className="mt-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Agency Ratings</div>
              <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 font-black uppercase">Agency</th>
                    <th className="p-3 font-black uppercase">Issuer</th>
                    <th className="p-3 font-black uppercase">Senior Unsec</th>
                    <th className="p-3 font-black uppercase">Outlook</th>
                    <th className="p-3 font-black uppercase">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.riskAssessment?.publicRatings?.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-3 font-black">{r.agency}</td>
                      <td className="p-3">{r.issuerRating || "-"}</td>
                      <td className="p-3">{r.seniorUnsecured || "-"}</td>
                      <td className="p-3">{r.outlook || "-"}</td>
                      <td className="p-3 text-slate-500">{r.updatedAt || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PreviewTextArea label="Risk Assessment Summary" value={getNested(data, 'riskAssessment.additionalComments')} />
          </section>

          {/* 7. Facility Details */}
          <section className="space-y-4">
            <PreviewHeader title="7. Facility Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 px-2">
              <PreviewRow label="Margin" value={getNested(data, 'facilityDetails.rates.margin')} />
              <PreviewRow label="Fee" value={getNested(data, 'facilityDetails.rates.fee')} />
              <PreviewRow label="All-In" value={getNested(data, 'facilityDetails.rates.allIn')} />
              <PreviewRow label="Upfront" value={getNested(data, 'facilityDetails.rates.upfront')} />
              <PreviewRow label="Tenor" value={getNested(data, 'facilityDetails.terms.tenor')} />
              <PreviewRow label="Maturity" value={getNested(data, 'facilityDetails.terms.maturity')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 px-2">
               <PreviewRow label="Amortizing" value={getNested(data, 'facilityDetails.repayment.amortizing')} />
               <PreviewRow label="Prepayment Permitted" value={getNested(data, 'facilityDetails.prepayment.permitted')} />
            </div>
            <PreviewTextArea label="Facility Narrative" value={getNested(data, 'facilityDetails.additionalComments')} />
          </section>

          {/* 8. Legal & Covenants */}
          <section className="space-y-4">
            <PreviewHeader title="8. Legal & Covenants" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 px-2">
              <PreviewRow label="Agreement Type" value={getNested(data, 'documentation.agreementType')} />
              <PreviewRow label="Agreement Date" value={getNested(data, 'documentation.date')} />
              <PreviewRow label="Status" value={getNested(data, 'documentation.status')} />
              <PreviewRow label="Jurisdiction" value={getNested(data, 'documentation.jurisdiction')} />
            </div>
            <div className="grid grid-cols-1 gap-4 mt-6">
              <PreviewTextArea label="Amendments" value={getNested(data, 'documentation.amendments')} />
              <PreviewTextArea label="Negative Covenants" value={getNested(data, 'documentation.negativeCovenants')} />
              <PreviewTextArea label="Positive Covenants" value={getNested(data, 'documentation.positiveCovenants')} />
              <PreviewTextArea label="Financial Covenants" value={getNested(data, 'documentation.financialCovenants')} />
              <PreviewTextArea label="Events of Default" value={getNested(data, 'documentation.eventsOfDefault')} />
              <PreviewTextArea label="Reporting Requirements" value={getNested(data, 'documentation.reportingReqs')} />
              <PreviewTextArea label="Funding Conditions" value={getNested(data, 'documentation.fundingConditions')} />
            </div>
            <PreviewTextArea label="Legal Narrative" value={getNested(data, 'documentation.additionalComments')} />
          </section>

          {/* 9. Analysis Overview */}
          <section className="space-y-4">
            <PreviewHeader title="9. Analysis & Financial Review" />
            <PreviewTextArea label="Borrower Overview" value={getNested(data, 'analysis.overview.companyDesc')} />
            <PreviewTextArea label="Recent Events" value={getNested(data, 'analysis.overview.recentEvents')} />
            <PreviewTextArea label="Ratio Analysis" value={getNested(data, 'analysis.financial.ratioAnalysis')} />
            <PreviewTextArea label="Capital Structure" value={getNested(data, 'analysis.financial.capStructure')} />
            <PreviewTextArea label="Liquidity Analysis" value={getNested(data, 'analysis.financial.liquidity')} />
            <PreviewTextArea label="Debt Maturity Profile" value={getNested(data, 'analysis.financial.debtMaturity')} />
          </section>

          {/* 10. Compliance & Sign-off */}
          <section className="space-y-4 mt-12 border-t-2 border-slate-200 pt-10">
            <PreviewHeader title="10. Sign-off & Compliance" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 px-2">
              <PreviewRow label="Signatory Name" value={getNested(data, 'compliance.signOff.name')} />
              <PreviewRow label="Signatory Title" value={getNested(data, 'compliance.signOff.title')} />
              <PreviewRow label="Sign-off Date" value={getNested(data, 'compliance.signOff.date')} />
              <PreviewRow label="Approver" value={getNested(data, 'compliance.signOff.approver')} />
            </div>
            <div className="mt-8 space-y-4">
              <PreviewTextArea label="Declaration of Interest" value={getNested(data, 'compliance.legal.declarationInterest')} />
              <PreviewTextArea label="Directors Information" value={getNested(data, 'compliance.legal.directors')} />
              <PreviewTextArea label="Illegal Tying Disclosure" value={getNested(data, 'compliance.legal.illegalTying')} />
              <PreviewTextArea label="Compliance Comments" value={getNested(data, 'compliance.additionalComments')} />
            </div>
            
            {/* Signature Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-20">
              <div className="space-y-4 border-t border-slate-300 pt-6">
                <div className="text-xs font-black text-slate-800 uppercase">{getNested(data, 'compliance.signOff.name') || "Analyst Signature"}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{getNested(data, 'compliance.signOff.title') || "Senior Analyst"}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Digitally Authenticated: {getNested(data, 'compliance.signOff.date')}</div>
              </div>
              <div className="space-y-4 border-t border-slate-300 pt-6">
                <div className="text-xs font-black text-slate-800 uppercase">{getNested(data, 'compliance.signOff.approver') || "Approver Signature"}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Credit Risk Management</div>
              </div>
            </div>
          </section>
        </div>
      );

    default:
      return null;
  }
};

export default SectionRenderer;
