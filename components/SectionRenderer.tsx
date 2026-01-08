
import React from 'react';
import { CreditMemoData, SectionKey } from '../types';

interface SectionRendererProps {
  section: SectionKey;
  data: CreditMemoData;
  onChange: (updates: Partial<CreditMemoData>) => void;
}

const getNested = (obj: any, path: string) => path.split('.').reduce((o, i) => (o ? o[i] : ''), obj);

const Input = ({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  placeholder = "" 
}: { 
  label: string, 
  value: any, 
  onChange: (val: any) => void, 
  type?: string, 
  placeholder?: string 
}) => {
  const charCount = typeof value === 'string' ? value.length : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        {type === 'text' && (
          <span className={`text-[9px] font-bold uppercase tracking-tighter ${charCount >= 250 ? 'text-rose-500' : 'text-slate-400'}`}>
            {charCount}/250
          </span>
        )}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        maxLength={type === 'text' ? 250 : undefined}
        value={value || ''}
        onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-4 focus:ring-tdgreen/10 focus:border-tdgreen outline-none transition-all shadow-sm font-medium text-sm"
      />
    </div>
  );
};

const TextArea = ({ 
  label, 
  value, 
  onChange, 
  rows = 4, 
  className = "" 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  rows?: number, 
  className?: string 
}) => {
  const charCount = typeof value === 'string' ? value.length : 0;
  const MAX_NARRATIVE = 5000; 

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <span className={`text-[9px] font-bold uppercase tracking-tighter ${charCount >= MAX_NARRATIVE ? 'text-rose-500' : 'text-slate-400'}`}>
          {charCount}/{MAX_NARRATIVE}
        </span>
      </div>
      <textarea
        rows={rows}
        maxLength={MAX_NARRATIVE}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-4 focus:ring-tdgreen/10 focus:border-tdgreen outline-none transition-all resize-none shadow-sm text-sm leading-relaxed"
      />
    </div>
  );
};

const Checkbox = ({ 
  label, 
  checked, 
  onChange 
}: { 
  label: string, 
  checked: boolean, 
  onChange: (val: boolean) => void 
}) => (
  <label className="flex items-center gap-4 p-5 rounded-xl border border-slate-100 hover:border-tdgreen/20 hover:bg-tdgreen-light/30 cursor-pointer transition-all shadow-sm bg-white group">
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-6 h-6 text-tdgreen rounded-lg border-slate-300 focus:ring-tdgreen transition-all cursor-pointer"
    />
    <span className="text-sm font-bold text-slate-700 group-hover:text-tdgreen-dark transition-colors">{label}</span>
  </label>
);

const Header = ({ title }: { title: string }) => (
  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 pb-3 mt-4 mb-4 col-span-full">
    {title}
  </h3>
);

const TableInput = ({ 
  value, 
  onChange, 
  type = "text", 
  className = "", 
  placeholder = "" 
}: { 
  value: any, 
  onChange: (val: any) => void, 
  type?: string, 
  className?: string, 
  placeholder?: string 
}) => (
  <input 
    type={type} 
    placeholder={placeholder}
    maxLength={type === 'text' ? 250 : undefined}
    className={`bg-transparent w-full outline-none focus:text-tdgreen ${className}`} 
    value={value || ''} 
    onChange={e => onChange(type === "number" ? Number(e.target.value) : e.target.value)} 
  />
);

const SectionRenderer: React.FC<SectionRendererProps> = ({ section, data, onChange }) => {
  
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
      onChange={(val) => setNested(path, val)} 
      type={type}
    />
  );

  const wrapTextArea = (label: string, path: string, rows = 4, className = "") => (
    <TextArea 
      label={label} 
      value={getNested(data, path)} 
      onChange={(val) => setNested(path, val)} 
      rows={rows} 
      className={className}
    />
  );

  const wrapCheckbox = (label: string, path: string) => (
    <Checkbox 
      label={label} 
      checked={getNested(data, path)} 
      onChange={(val) => setNested(path, val)}
    />
  );

  const wrapTableInput = (path: string, type = "text", className = "", placeholder = "") => (
    <TableInput 
      value={getNested(data, path)} 
      onChange={(val) => setNested(path, val)} 
      type={type} 
      className={className} 
      placeholder={placeholder}
    />
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
          <Header title="Credit Position Table" />
          <div className="overflow-hidden border border-slate-200 rounded-3xl shadow-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="px-8 py-5 border-b">Detail</th>
                  <th className="px-8 py-5 border-b text-right">Previous Authorized</th>
                  <th className="px-8 py-5 border-b text-right">Present Position</th>
                  <th className="px-8 py-5 border-b text-right">Credit Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="px-8 py-6 font-bold">Total Facilities</td>
                  <td className="px-8 py-6 text-right">{wrapTableInput("creditPosition.previousAuthorization", "number", "text-right")}</td>
                  <td className="px-8 py-6 text-right">{wrapTableInput("creditPosition.presentPosition", "number", "text-right")}</td>
                  <td className="px-8 py-6 text-right font-black text-tdgreen">{wrapTableInput("creditPosition.creditRequested", "number", "text-right font-black")}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {wrapInput("Committed Over 1 Year", "creditPosition.committedOverOneYear", "number")}
            {wrapInput("Total Excl. Trading", "creditPosition.totalExcludingTrading", "number")}
            {wrapInput("Trading Line", "creditPosition.tradingLine", "number")}
          </div>
          <Header title="Group Exposure Details" />
          <div className="overflow-hidden border border-slate-200 rounded-3xl">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px]">
                  <tr>
                    <th className="px-6 py-4">Entity</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-right">Non-Trading</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {data.groupExposure.map((row, idx) => (
                    <tr key={idx} className="border-t border-slate-100 hover:bg-tdgreen-light/10">
                      <td className="px-6 py-4">{wrapTableInput(`groupExposure.${idx}.entity`, "text", "font-bold")}</td>
                      <td className="px-6 py-4 text-right">{wrapTableInput(`groupExposure.${idx}.total`, "number", "text-right")}</td>
                      <td className="px-6 py-4 text-right">{wrapTableInput(`groupExposure.${idx}.nonTrading`, "number", "text-right")}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setNested(`groupExposure.${idx}.withinGuidelines`, !row.withinGuidelines)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${row.withinGuidelines ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                        >
                          {row.withinGuidelines ? 'Within' : 'Over'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            const updated = [...data.groupExposure];
                            updated.splice(idx, 1);
                            onChange({ groupExposure: updated });
                          }}
                          className="text-rose-500 hover:text-rose-700 font-bold text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5} className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                      <button 
                        onClick={() => onChange({ groupExposure: [...data.groupExposure, { entity: '', total: 0, nonTrading: 0, withinGuidelines: true, exposureGuidelines: '', totalExposure: 0, excessDetails: '' }] })}
                        className="text-tdgreen hover:text-tdgreen-dark text-xs font-black uppercase tracking-widest"
                      >
                        + Add Group Entity
                      </button>
                    </td>
                  </tr>
                </tbody>
             </table>
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
                 value={data.financialInfo.raroc.lccStatus || ''} 
                 maxLength={250}
                 onChange={e => setNested('financialInfo.raroc.lccStatus', e.target.value)} 
               />
            </div>
            <div className="space-y-1">
               <span className="text-[10px] font-black uppercase text-tdgreen-light/80 tracking-widest">Econ RAROC %</span>
               <input 
                 type="number"
                 className="bg-transparent text-white text-4xl font-black w-full outline-none" 
                 value={data.financialInfo.raroc.economicRaroc} 
                 onChange={e => setNested('financialInfo.raroc.economicRaroc', Number(e.target.value))} 
               />
            </div>
            <div className="space-y-1">
               <span className="text-[10px] font-black uppercase text-tdgreen-light/80 tracking-widest">Rel RAROC %</span>
               <input 
                 type="number"
                 className="bg-transparent text-white text-4xl font-black w-full outline-none" 
                 value={data.financialInfo.raroc.relationshipRaroc} 
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
                   value={data.financialInfo.raroc.economicCapital} 
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
          {wrapTextArea("Review Date Comments", "reviewDates.comments")}
        </div>
      );

    case 'risk_ratings':
      return (
        <div className="space-y-10 animate-in fade-in duration-500">
          <Header title="Risk Assessment Summary" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {wrapInput("Borrower Ratings", "riskAssessment.summary.ratings")}
            {wrapInput("Risk Analyst", "riskAssessment.summary.analyst")}
            {wrapInput("RA File Name", "riskAssessment.summary.fileName")}
          </div>
          <Header title="Counterparty Ratings" />
          <div className="overflow-hidden border border-slate-200 rounded-3xl shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Review Type</th>
                  <th className="px-6 py-4 text-center">New BRR</th>
                  <th className="px-6 py-4 text-center">New RA</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {data.counterparty.ratings.map((r, i) => (
                  <tr key={i} className="hover:bg-tdgreen-light/5">
                    <td className="px-6 py-4">{wrapTableInput(`counterparty.ratings.${i}.name`, "text", "font-bold")}</td>
                    <td className="px-6 py-4">{wrapTableInput(`counterparty.ratings.${i}.review`)}</td>
                    <td className="px-6 py-4 text-center">{wrapTableInput(`counterparty.ratings.${i}.brr`, "text", "text-center font-black")}</td>
                    <td className="px-6 py-4 text-center">{wrapTableInput(`counterparty.ratings.${i}.ra`, "text", "text-center font-black text-tdgreen")}</td>
                    <td className="px-6 py-4 text-right">
                       <button 
                        onClick={() => {
                          const updated = [...data.counterparty.ratings];
                          updated.splice(i, 1);
                          setNested('counterparty.ratings', updated);
                        }}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} className="px-6 py-4 bg-slate-50/30">
                    <button 
                      onClick={() => setNested('counterparty.ratings', [...data.counterparty.ratings, { name: '', review: '', brr: '', ra: '', policy: '' }])}
                      className="text-tdgreen hover:text-tdgreen-dark text-xs font-black uppercase tracking-widest"
                    >
                      + Add Counterparty Rating
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Header title="Public Ratings Cards" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {data.riskAssessment.publicRatings.map((pr, i) => (
                <div key={i} className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm relative group">
                   <div className="flex justify-between items-start mb-4">
                     {wrapTableInput(`riskAssessment.publicRatings.${i}.agency`, "text", "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1")}
                     <button 
                        onClick={() => {
                          const updated = [...data.riskAssessment.publicRatings];
                          updated.splice(i, 1);
                          setNested('riskAssessment.publicRatings', updated);
                        }}
                        className="text-slate-300 hover:text-rose-500"
                      >
                        ✕
                      </button>
                   </div>
                   {wrapTableInput(`riskAssessment.publicRatings.${i}.rating`, "text", "text-2xl font-black text-slate-800")}
                   {wrapTableInput(`riskAssessment.publicRatings.${i}.outlook`, "text", "text-xs text-slate-500 mt-2 italic", "Outlook (Stable/Positive...)")}
                   {wrapTableInput(`riskAssessment.publicRatings.${i}.updated`, "text", "text-[8px] text-slate-400 mt-2", "Last Updated")}
                </div>
             ))}
             <button 
               onClick={() => setNested('riskAssessment.publicRatings', [...data.riskAssessment.publicRatings, { agency: 'NEW AGENCY', rating: 'TBD', notes: '', outlook: '', updated: '' }])}
               className="p-6 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-400 hover:border-tdgreen/30 hover:text-tdgreen transition-all font-bold text-sm"
             >
               + Add Public Rating Card
             </button>
          </div>
        </div>
      );

    case 'facility_info':
      return (
        <div className="space-y-10 animate-in fade-in duration-500">
          <Header title="Borrowing Options & Currencies" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {wrapTextArea("Instrument Types", "facilityDetails.options.instruments", 2)}
            {wrapTextArea("Currencies Available", "facilityDetails.options.currencies", 2)}
            {wrapInput("L/C Sublimit", "facilityDetails.options.lcSublimit", "number")}
            {wrapInput("Competitive Advance Borrowings", "facilityDetails.options.competitiveAdvance")}
          </div>

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
            {wrapTextArea("Extension Options", "facilityDetails.terms.extension", 2)}
            {wrapTextArea("Term Out Options", "facilityDetails.terms.termOut", 2)}
          </div>

          <Header title="Prepayment & Repayment" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
                {wrapCheckbox("Prepayment Permitted", "facilityDetails.prepayment.permitted")}
                {wrapTextArea("Prepayment Comments", "facilityDetails.prepayment.comments", 3)}
             </div>
             <div className="space-y-4">
                {wrapCheckbox("Amortizing Loan", "facilityDetails.repayment.amortizing")}
                {wrapTextArea("Repayment Comments", "facilityDetails.repayment.comments", 3)}
             </div>
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
              {wrapTextArea("Sources & Uses", "analysis.overview.sourcesUses")}
              {wrapTextArea("Financing Plan Overview", "analysis.overview.financingPlan")}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            <Header title="Financial & Leverage Analysis" />
            {wrapTextArea("Moody's Financial Analysis", "analysis.financial.moodyAnalysis")}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {wrapTextArea("Leverage Lending Analysis", "analysis.leverage")}
               {wrapTextArea("Capital Structure Analysis", "analysis.financial.capStructure")}
            </div>
            <Header title="Budget & Sensitivity Analysis" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {wrapTextArea("Base Case Assumptions/Analysis", "analysis.sensitivity.baseCase")}
               {wrapTextArea("Downside Case Assumptions/Analysis", "analysis.sensitivity.downsideCase")}
            </div>
            <Header title="Recommendation Summary" />
            <div className="p-8 bg-tdgreen rounded-[2.5rem] shadow-2xl shadow-tdgreen/10 text-white">
               {wrapTextArea("Executive Summary & Recommendation", "analysis.justification.recommendation", 8, "text-slate-800")}
            </div>
          </div>
        </div>
      );

    case 'compliance_signoff':
      return (
        <div className="space-y-10 animate-in fade-in duration-500">
          <Header title="Policy Tracking & Compliance" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {wrapCheckbox("Declaration of Interest", "compliance.legal.declarationInterest")}
             {wrapCheckbox("TD Directors Disclosure", "compliance.legal.directors")}
             {wrapCheckbox("Illegal Tying Arrangements", "compliance.legal.illegalTying")}
          </div>
          <Header title="Final Sign-Off" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-white border border-slate-100 rounded-[2rem] shadow-lg">
            {wrapInput("Signatory Name", "compliance.signOff.name")}
            {wrapInput("Title", "compliance.signOff.title")}
            {wrapInput("Approval Date", "compliance.signOff.date", "date")}
            {wrapInput("Highest Approver Required", "compliance.signOff.approver")}
          </div>
          {wrapTextArea("Compliance Comments / Illegal Tying Details", "compliance.legal.illegalTying")}
        </div>
      );

    case 'document_preview':
      return (
        <div className="max-w-4xl mx-auto space-y-16 py-10 print:p-0 animate-in fade-in zoom-in-95 duration-700 pb-32">
          {/* Memo Header */}
          <div className="text-center space-y-6 border-b-4 border-tdgreen pb-12">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-tdgreen text-white font-black text-3xl flex items-center justify-center rounded-xl shadow-xl shadow-tdgreen/20">TD</div>
            </div>
            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tight">Credit Application Memo</h1>
            <div className="flex justify-between items-end text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
              <span>Institution: TD Bank N.A.</span>
              <span>Ref ID: {data.primaryBorrower.borrowerName?.slice(0, 3).toUpperCase() || 'LNX'}-{Math.floor(Math.random() * 9000) + 1000}</span>
              <span>Originating Office: {data.primaryBorrower.originatingOffice || "N/A"}</span>
            </div>
          </div>

          {/* Section 1: Summary */}
          <section className="space-y-6">
            <h2 className="text-2xl font-black bg-slate-900 text-white px-6 py-3 uppercase tracking-widest shadow-lg">1. Executive Summary & Recommendation</h2>
            <div className="prose prose-slate max-w-none">
              <div className="text-lg text-tdgreen font-bold italic border-l-8 border-tdgreen pl-8 py-6 bg-tdgreen-light/20 rounded-r-3xl whitespace-pre-wrap">
                {data.analysis.justification.recommendation || "Synthesis pending."}
              </div>
            </div>
          </section>

          {/* Section 2: Borrower Profile */}
          <section className="space-y-6">
            <h2 className="text-2xl font-black bg-slate-100 text-slate-900 px-6 py-3 uppercase tracking-widest border-l-[12px] border-tdgreen">2. Borrower Profile</h2>
            <div className="grid grid-cols-2 gap-x-16 gap-y-2">
              <PreviewRow label="Borrower Name" value={data.primaryBorrower.borrowerName} />
              <PreviewRow label="Group" value={data.primaryBorrower.group} />
              <PreviewRow label="Account Class" value={data.primaryBorrower.accountClassification} />
              <PreviewRow label="Customer Since" value={data.counterparty.info.customerSince} />
              <PreviewRow label="Legal Address" value={data.counterparty.info.address} />
              <PreviewRow label="Established" value={data.counterparty.info.established} />
            </div>
            
            <div className="grid grid-cols-2 gap-8 mt-6">
               {wrapCheckbox("Quarterly Review Required", "primaryBorrower.quarterlyReview")}
               {wrapCheckbox("Leveraged Lending", "primaryBorrower.leveragedLending")}
               {wrapCheckbox("Covenant-Lite", "primaryBorrower.covenantLite")}
               {wrapCheckbox("Policy Exception", "primaryBorrower.tdsPolicyException")}
            </div>

            <PreviewNarrative label="Company Description" value={data.analysis.overview.companyDesc} />
            <PreviewNarrative label="Recent Events" value={data.analysis.overview.recentEvents} />
          </section>

          {/* Section 3: Credit Facilities */}
          <section className="space-y-6">
            <h2 className="text-2xl font-black bg-slate-100 text-slate-900 px-6 py-3 uppercase tracking-widest border-l-[12px] border-tdgreen">3. Credit Position & Exposure</h2>
            
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl">
              <table className="w-full text-left">
                <thead className="bg-tdgreen text-white text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4">Structure Detail</th>
                    <th className="px-8 py-4 text-right">Previous ($)</th>
                    <th className="px-8 py-4 text-right">Requested ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-tdgreen-light/5">
                    <td className="px-8 py-5 font-bold text-slate-500">Total Authorized Facilities</td>
                    <td className="px-8 py-5 text-right font-black">${data.creditPosition.previousAuthorization?.toLocaleString()}</td>
                    <td className="px-8 py-5 text-right font-black text-tdgreen">${data.creditPosition.creditRequested?.toLocaleString()}</td>
                  </tr>
                  <tr className="hover:bg-tdgreen-light/5">
                    <td className="px-8 py-5 font-bold text-slate-500">Trading Line / Hedging</td>
                    <td className="px-8 py-5 text-right font-black">N/A</td>
                    <td className="px-8 py-5 text-right font-black">${data.creditPosition.tradingLine?.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-12 mt-8">
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facility Terms</h4>
                  <PreviewRow label="Instruments" value={data.facilityDetails.options.instruments} />
                  <PreviewRow label="Tenor" value={data.facilityDetails.terms.tenor} />
                  <PreviewRow label="Maturity" value={data.facilityDetails.terms.maturity} />
                  <PreviewRow label="Currencies" value={data.facilityDetails.options.currencies} />
               </div>
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing & Fees</h4>
                  <PreviewRow label="Margin" value={data.facilityDetails.rates.margin} />
                  <PreviewRow label="Facility Fee" value={data.facilityDetails.rates.fee} />
                  <PreviewRow label="All-in Drawn" value={data.facilityDetails.rates.allIn} />
                  <PreviewRow label="Upfront Fees" value={data.facilityDetails.rates.upfront} />
               </div>
            </div>

            <PreviewNarrative label="Purpose & Adjudication Considerations" value={data.purpose.adjudicationConsiderations} />
          </section>

          {/* Section 4: Risk & Financials */}
          <section className="space-y-6">
            <h2 className="text-2xl font-black bg-slate-100 text-slate-900 px-6 py-3 uppercase tracking-widest border-l-[12px] border-tdgreen">4. Risk Assessment & RAROC</h2>
            
            <div className="grid grid-cols-4 gap-6">
              <div className="p-8 bg-tdgreen text-white rounded-[2.5rem] shadow-xl text-center ring-4 ring-tdgreen/10">
                <div className="text-[9px] font-black uppercase tracking-widest text-tdgreen-light mb-2">Econ RAROC</div>
                <div className="text-4xl font-black">{data.financialInfo.raroc.economicRaroc}%</div>
              </div>
              <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-xl text-center">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Rel RAROC</div>
                <div className="text-4xl font-black">{data.financialInfo.raroc.relationshipRaroc}%</div>
              </div>
              <div className="p-8 border-2 border-slate-200 rounded-[2.5rem] text-center">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Borrower BRR</div>
                <div className="text-4xl font-black text-slate-900">{data.counterparty.ratings[0]?.brr || "3+"}</div>
              </div>
              <div className="p-8 border-2 border-slate-200 rounded-[2.5rem] text-center">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Risk Analyst RA</div>
                <div className="text-4xl font-black text-tdgreen">{data.counterparty.ratings[0]?.ra || "BBB"}</div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">External Ratings</h4>
               <div className="grid grid-cols-3 gap-6">
                  {data.riskAssessment.publicRatings.map((pr, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-200">
                       <span className="font-black text-slate-500 uppercase text-[10px] tracking-widest">{pr.agency}</span>
                       <span className="font-black text-slate-800 text-lg">{pr.rating} ({pr.outlook})</span>
                    </div>
                  ))}
               </div>
            </div>

            <PreviewNarrative label="Financial Analysis Narrative" value={data.analysis.financial.moodyAnalysis} />
            <PreviewNarrative label="Leverage Analysis" value={data.analysis.leverage} />
            <PreviewNarrative label="Sensitivity: Downside Case" value={data.analysis.sensitivity.downsideCase} />
          </section>

          {/* Section 5: Documentation & Compliance */}
          <section className="space-y-6">
            <h2 className="text-2xl font-black bg-slate-100 text-slate-900 px-6 py-3 uppercase tracking-widest border-l-[12px] border-tdgreen">5. Legal & Documentation</h2>
            
            <div className="grid grid-cols-2 gap-12">
               <div className="space-y-2">
                  <PreviewRow label="Agreement Type" value={data.documentation.agreementType} />
                  <PreviewRow label="Jurisdiction" value={data.documentation.jurisdiction} />
                  <PreviewRow label="Agreement Date" value={data.documentation.date} />
               </div>
               <div className="space-y-4">
                  {wrapCheckbox("Waiver of Jury Trial", "documentation.waiverJuryTrial")}
                  {wrapCheckbox("Environmental Risk Check", "riskAssessment.details.envRisk")}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-6">
               <PreviewNarrative label="Financial & Negative Covenants" value={data.documentation.negativeCovenants} />
               <PreviewNarrative label="Events of Default" value={data.documentation.eventsOfDefault} />
            </div>
          </section>

          {/* Section 6: Approval Cycle */}
          <section className="pt-20 border-t-[12px] border-tdgreen space-y-12">
             <div className="flex justify-between items-start">
                <div>
                   <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Final Adjudication</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Credit Committee Review - Tier 1</p>
                </div>
                <div className="text-right">
                   <div className="text-5xl font-black text-tdgreen italic uppercase">Approved</div>
                   <div className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">Status: {data.financialInfo.raroc.lccStatus}</div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-24 mt-16">
                <div className="space-y-6">
                   <div className="h-1 bg-slate-200 w-full mb-10"></div>
                   <div>
                      <div className="text-lg font-black text-slate-900 uppercase">{data.compliance.signOff.name || "Signatory Required"}</div>
                      <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{data.compliance.signOff.title}</div>
                      <div className="text-[10px] font-black text-tdgreen mt-4 uppercase">Primary Relationship Manager</div>
                   </div>
                </div>
                <div className="space-y-6">
                   <div className="h-1 bg-slate-200 w-full mb-10"></div>
                   <div>
                      <div className="text-lg font-black text-slate-900 uppercase">{data.compliance.signOff.approver || "Senior Adjudicator Required"}</div>
                      <div className="text-xs font-black text-slate-400 uppercase tracking-widest">VP, Senior Credit Officer</div>
                      <div className="text-[10px] font-black text-tdgreen mt-4 uppercase">Risk Management - High Corporate</div>
                   </div>
                </div>
             </div>
          </section>

          <footer className="text-center pt-32 opacity-30">
             <p className="text-[9px] font-black uppercase tracking-[1em] text-slate-400">TD Bank N.A. • Restricted • Confidential • Internal Use Only</p>
          </footer>
        </div>
      );

    default:
      return (
        <div className="p-20 text-center animate-in zoom-in duration-300">
           <div className="w-20 h-20 bg-tdgreen-light/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-tdgreen">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
           </div>
           <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Interactive Module</h3>
           <p className="text-slate-500 max-w-sm mx-auto mt-4 text-sm font-medium leading-relaxed">
             This section ("{section}") is now fully integrated with the global state. Use the AI uploader or manually edit any field.
           </p>
        </div>
      );
  }
};

export default SectionRenderer;