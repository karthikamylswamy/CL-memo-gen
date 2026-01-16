import React, { useState } from 'react';
import { CreditMemoData, SectionKey, SourceFile, PublicRating, FieldSource } from '../types';

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
  if (!text) return <span className="text-slate-300 italic">Information pending AI extraction or manual entry.</span>;
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
                  Exhibit: {alt}
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
                  </div>
                )}
              </div>
            );
          }
          return <div key={i} className="text-[10px] text-rose-500 font-bold italic border-l-2 border-rose-200 pl-3 my-2">[Missing Attachment: {filename}]</div>;
        }
        return <div key={i} className="whitespace-pre-wrap leading-relaxed">{part}</div>;
      })}
    </div>
  );
};

const getNested = (obj: any, path: string) => path.split('.').reduce((o, i) => (o && typeof o === 'object' ? o[i] : undefined), obj) ?? '';

const SourceBadge: React.FC<{ source?: FieldSource }> = ({ source }) => {
  if (!source) return null;
  return (
    <div className="group relative inline-flex ml-2">
      <div className="px-2 py-0.5 bg-tdgreen/10 rounded-full text-tdgreen border border-tdgreen/20 flex items-center gap-1.5 transition-all hover:bg-tdgreen/20 cursor-help">
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <span className="text-[8px] font-black uppercase tracking-tighter">Ref: {source.pageNumber}</span>
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

  /**
   * Fix: Changed `children` to optional in `MemoSection` to resolve TypeScript errors where children 
   * passed in JSX blocks were not correctly mapped to required props in some compilation contexts.
   */
  const MemoSection = ({ id, title, children }: { id: string, title: string, children?: React.ReactNode }) => (
    <div className="mb-12 print:mb-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">{id}</div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{title}</h2>
        <div className="h-px bg-slate-200 flex-1"></div>
      </div>
      <div className="pl-14">{children}</div>
    </div>
  );

  const FlagRow = ({ label, value }: { label: string, value: any }) => {
    const displayValue = value === true ? 'Yes' : value === false ? 'No' : 'N/A';
    return (
      <div className="flex items-center justify-between py-2 border-b border-slate-50 group hover:bg-slate-50/50 transition-colors">
        <span className="text-xs font-bold text-slate-600 italic">o {label}</span>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-black uppercase tracking-widest ${value === true ? 'text-tdgreen' : 'text-slate-400'}`}>
            {displayValue}
          </span>
          <div className={`w-3 h-3 rounded-full ${value === true ? 'bg-tdgreen shadow-[0_0_8px_rgba(0,138,0,0.5)]' : 'bg-slate-200'}`}></div>
        </div>
      </div>
    );
  };

  const DataRow = ({ label, value, path, className = "" }: { label: string, value: any, path?: string, className?: string }) => (
    <div className={`flex items-baseline py-2 border-b border-slate-50 ${className}`}>
      <span className="w-48 text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}:</span>
      <span className="flex-1 text-sm font-bold text-slate-800">{value === true ? "YES" : value === false ? "NO" : (value || "N/A")}</span>
      {path && data.fieldSources?.[path] && <SourceBadge source={data.fieldSources[path]} />}
    </div>
  );

  const PreviewHeader = ({ title }: { title: string }) => (
    <div className="mb-8 border-b-2 border-slate-900 pb-2 mt-12 first:mt-0">
      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
    </div>
  );

  const PreviewTextArea = ({ label, value, path }: { label: string, value: string, path?: string }) => (
    <div className="px-6 space-y-2 mb-8">
      <div className="flex items-center gap-2">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</h4>
        {path && data.fieldSources?.[path] && <SourceBadge source={data.fieldSources[path]} />}
      </div>
      <div className="text-sm leading-relaxed text-slate-800 bg-slate-50/50 p-6 border-l-4 border-slate-200 whitespace-pre-wrap font-serif italic">
        {value || "No information provided."}
      </div>
    </div>
  );

  if (section === 'executive_credit_memo') {
    return (
      <div className="max-w-5xl mx-auto py-10 px-12 bg-white shadow-2xl rounded-sm font-serif print:shadow-none print:px-0">
        <div className="flex justify-between items-start mb-16 border-b-4 border-slate-900 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-tdgreen text-white p-2 font-black text-2xl">TD</div>
              <div className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Credit Management • Private & Confidential</div>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Executive Credit Memo</h1>
            <div className="mt-4 flex gap-4 text-xs font-black uppercase tracking-widest text-slate-500">
               <span>Date: {new Date().toLocaleDateString()}</span>
               <span>Status: FINAL FOR COMMITTEE</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase">Analyst: {getNested(data, 'compliance.signOff.approver') || "Analyst Team"}</p>
          </div>
        </div>

        {/* Section A */}
        <MemoSection id="A" title="Leveraged Lending Policy, TDS Credit Standards, and other reporting Classification">
          <div className="grid grid-cols-2 gap-x-16 gap-y-1">
            <FlagRow label="TDS Corporate Banking Credit Standards Exception" value={data.primaryBorrower?.creditException} />
            <FlagRow label="Weak Underwriting" value={data.primaryBorrower?.weakUnderwriting} />
            <FlagRow label="TDS Leveraged Loan" value={data.primaryBorrower?.tdsLeveragedLoan} />
            <FlagRow label="Regulatory Leveraged Loan" value={data.primaryBorrower?.regulatoryLeveragedLoan} />
            <FlagRow label="5 Rated leveraged Loan with leverage > 5.5x" value={data.primaryBorrower?.highLeverageLoan} />
            <FlagRow label="Sufficient room within Leverage Loan dollar policy limit" value={data.primaryBorrower?.leveragePolicyRoom} />
            <FlagRow label="Leverage > 6.0x" value={data.primaryBorrower?.extremeLeverage} />
            <FlagRow label="HRSL Sub limit" value={data.primaryBorrower?.hrslSubLimit} />
            <FlagRow label="CMT Strategic Loan Sub Limit" value={data.primaryBorrower?.cmtStrategicLimit} />
            <FlagRow label="ESG Strategic Loan Sub Limit" value={data.primaryBorrower?.esgStrategicLimit} />
            <FlagRow label="Euro Infrastructure Sub Limit" value={data.primaryBorrower?.euroInfraLimit} />
            <FlagRow label="High Risk Account (QHRR)" value={data.primaryBorrower?.highRiskAccount} />
            <FlagRow label="Spotlight Account" value={data.primaryBorrower?.spotlightAccount} />
            <FlagRow label="Covenant-Lite" value={data.primaryBorrower?.covenantLite} />
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
               <span className="text-xs font-bold text-slate-600 italic">o SEA score</span>
               <span className="text-[10px] font-black text-tdgreen uppercase bg-tdgreen/5 px-3 py-1 rounded-full">{data.primaryBorrower?.seaScore || "7.2"}</span>
            </div>
          </div>
        </MemoSection>

        {/* Section B */}
        <MemoSection id="B" title="Borrower Overview">
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-xl border-l-4 border-slate-200">
               <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Narrative + Supporting Bullets</h4>
               <SmartNarrative text={data.analysis?.overview?.companyDesc} files={files} />
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">Reporting segments</h4>
                 <p className="text-sm font-bold text-slate-800">{data.analysis?.overview?.segments || "Oil & Gas; Chemical; Midstream & Marketing"}</p>
              </div>
              <div className="space-y-2">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">Geographic Presence</h4>
                 <p className="text-sm font-bold text-slate-800">{data.analysis?.overview?.geography || "N/A"}</p>
              </div>
              <div className="space-y-2">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">End Customer / Industry Profile</h4>
                 <p className="text-sm font-bold text-slate-800">{getNested(data, 'analysis.overview.industryProfile') || "Placeholder: See Source Documents"}</p>
              </div>
              <div className="space-y-2">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">LTM revenue, EBITDA, margin</h4>
                 <p className="text-sm font-bold text-slate-800">{getNested(data, 'analysis.overview.ltmMetrics') || "Placeholder: Revenue, EBITDA metrics"}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-xl">
               <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Sponsor Overview</h4>
               <SmartNarrative text={data.analysis?.overview?.sponsorOverview} files={files} />
            </div>
            <div className="p-4 border border-dashed border-slate-200 text-center text-xs text-slate-400">
              Existing relationship discussion: {data.counterparty?.info?.customerSince || "TD: New"}
            </div>
          </div>
        </MemoSection>

        {/* Section C */}
        <MemoSection id="C" title="Request Overview">
          <div className="bg-slate-900 text-white p-8 rounded-sm shadow-xl">
             <h4 className="text-[10px] font-black uppercase opacity-40 mb-4 tracking-widest">Transaction and Financing Platform</h4>
             <SmartNarrative text={data.purpose?.businessPurpose} files={files} />
             <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
                <div><strong>Sponsor Purchase:</strong> {getNested(data, 'purpose.sponsorPurchase') || "Value, consideration details"}</div>
                <div><strong>Arrangers/Agents:</strong> {getNested(data, 'purpose.arrangers') || "Admin, Syndication, RCF Admin"}</div>
                <div><strong>Facilities:</strong> {getNested(data, 'purpose.syndicatedFacilities') || "TD invited to participate in RCF and both TLs"}</div>
                <div><strong>Funding Mix:</strong> {getNested(data, 'purpose.fundingMix') || "Debt, preferred, notes, asset sales"}</div>
             </div>
          </div>
        </MemoSection>

        {/* Section D - Valuation */}
        <MemoSection id="D" title="Valuation">
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-5 border-2 border-slate-100 rounded-2xl bg-white shadow-sm hover:border-tdgreen transition-colors">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-tighter mb-1">Weighted Approach</h4>
                    <p className="text-sm font-black text-slate-800">{data.analysis?.valuation?.approach || "Weighted Approach (DCF / trading / peer multiples); purchase multiple context"}</p>
                 </div>
                 <div className="p-5 border-2 border-slate-100 rounded-2xl bg-white shadow-sm hover:border-tdgreen transition-colors">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-tighter mb-1">Pro forma reserves & production</h4>
                    <p className="text-sm font-black text-slate-800">{data.analysis?.valuation?.reserves || "Pro forma reserves & production (Boe / boe/d)"}</p>
                 </div>
              </div>

              <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2">Valuation / Peer Comparison Analysis</h4>
                 <SmartNarrative text={data.analysis?.valuation?.peerComp} files={files} />
                 {!data.analysis?.valuation?.peerComp && (
                   <div className="bg-white/50 p-4 border border-dashed rounded-xl">
                      <p className="text-xs text-slate-400 italic font-medium leading-relaxed">
                        Placeholder: Implications for leverage and comparable (integration/leverage risks balanced by scale). 
                        Include valuation metrics relative to peer group.
                      </p>
                   </div>
                 )}
              </div>

              <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2">Sources & Uses</h4>
                 <SmartNarrative text={data.analysis?.overview?.sourcesUses} files={files} />
                 {!data.analysis?.overview?.sourcesUses && (
                   <p className="text-[10px] text-slate-400 font-bold uppercase text-center border-2 border-dashed py-10 rounded-xl">
                      [Insert Original "Sources & Uses" image/table here]
                   </p>
                 )}
              </div>

              {data.purpose?.sponsorPurchase && (
                <div className="p-6 bg-tdgreen/5 border border-tdgreen/10 rounded-2xl flex items-center gap-6">
                   <div className="w-12 h-12 bg-tdgreen rounded-xl flex items-center justify-center text-white text-xl shadow-lg">🎯</div>
                   <div>
                      <h4 className="text-[10px] font-black uppercase text-tdgreen tracking-widest">Sponsor Purchase Multiple</h4>
                      <p className="text-lg font-black text-slate-800">{data.purpose.sponsorPurchase}</p>
                   </div>
                </div>
              )}
           </div>
        </MemoSection>

        {/* Section E - Credit Request */}
        <MemoSection id="E" title="Credit Request">
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-x-12 px-6">
                 <DataRow label="Requested Aggregation" value={`$${(data.creditPosition?.creditRequested || 0).toLocaleString()}`} />
                 <DataRow label="Proposed BRR" value={data.riskAssessment?.borrowerRating?.proposedBrr} />
                 <DataRow label="Proposed FRR" value={data.riskAssessment?.borrowerRating?.proposedFrr} />
                 <DataRow label="Warehouse line request" value={data.creditPosition?.warehouseRequest} />
              </div>
              <div className="p-4 border rounded-xl space-y-2 text-xs">
                 <p><strong>Split Commitment Example:</strong></p>
                 <ul className="list-disc pl-5">
                   <li>$175MM to upsized $5.0Bn 5-year RCF</li>
                   <li>$125MM to new $4.4Bn 364-day DDTL</li>
                   <li>$125MM to new $4.4Bn 2-year DDTL</li>
                 </ul>
              </div>
              <div className="p-6 bg-tdgreen/5 border border-tdgreen/10 rounded-sm">
                 <h4 className="text-[10px] font-black text-tdgreen uppercase mb-3 tracking-widest">Leveraged Lending & Repayment Analysis</h4>
                 <SmartNarrative text={data.facilityDetails?.terms?.repaymentAnalysis} files={files} />
              </div>
           </div>
        </MemoSection>

        {/* Section F - Discretionary Authority */}
        <MemoSection id="F" title="Discretionary Authority">
           <div className="p-6 bg-rose-50 border border-rose-100 rounded-sm text-rose-900">
              <p className="text-sm font-black italic">Explicit statement: Executive & Credit Committee approval is required due to transaction size, excess over guidelines, and strategic nature. Approvals are subject to successful closing and asset divestitures.</p>
           </div>
        </MemoSection>

        {/* Section G - RAROC & Fees */}
        <MemoSection id="G" title="RAROC & Fees">
           <div className="grid grid-cols-3 gap-8">
              <div className="bg-tdgreen p-6 text-white text-center shadow-lg border-b-4 border-tdgreen-dark">
                 <p className="text-[9px] font-black uppercase opacity-60">Relationship RAROC</p>
                 <p className="text-3xl font-black">{data.financialInfo?.raroc?.relationshipRaroc || 0}%</p>
              </div>
              <div className="bg-slate-900 p-6 text-white text-center shadow-lg border-b-4 border-slate-700">
                 <p className="text-[9px] font-black uppercase opacity-60">Credit-only RAROC</p>
                 <p className="text-3xl font-black">{data.financialInfo?.raroc?.creditOnlyRaroc || 0}%</p>
              </div>
              <div className="bg-slate-50 p-6 text-slate-800 text-center border">
                 <p className="text-[9px] font-black uppercase text-slate-400">Underwriting/Commitment Fees</p>
                 <p className="text-sm font-black mt-1">{data.facilityDetails?.rates?.underwritingFee || "As per facility agreements; refer to source"}</p>
              </div>
           </div>
        </MemoSection>

        {/* Section H - Client Since */}
        <MemoSection id="H" title="Client Since">
           <div className="px-6 py-4 bg-slate-50 rounded-lg inline-block">
             <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Status</span>
             <p className="text-lg font-black text-slate-900">{data.counterparty?.info?.customerSince || "New"}</p>
           </div>
        </MemoSection>

        {/* Section I - Key Terms */}
        <MemoSection id="I" title="Key Terms">
           <div className="grid grid-cols-2 gap-8">
              <div className="p-4 bg-slate-50 border rounded-sm">
                 <h4 className="text-[9px] font-black uppercase text-slate-400 mb-2">Security</h4>
                 <p className="text-sm font-bold">{data.riskAssessment?.details?.security || "Unsecured, pari passu"}</p>
              </div>
              <div className="p-4 bg-slate-50 border rounded-sm">
                 <h4 className="text-[9px] font-black uppercase text-slate-400 mb-2">J.Crew/Serta/Chewy Provisions</h4>
                 <p className="text-sm font-bold">{data.documentation?.jCrewProvisions || "N/A"}</p>
              </div>
              <div className="col-span-full p-6 border-l-4 border-tdgreen bg-slate-50">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Covenants (Debt/Cap, Standard Negatives/Positives)</h4>
                 <SmartNarrative text={data.documentation?.financialCovenants} files={files} />
              </div>
              <div className="p-4 bg-slate-50 border rounded-sm">
                 <h4 className="text-[9px] font-black uppercase text-slate-400 mb-2">Subordination Risk</h4>
                 <p className="text-sm font-bold">{getNested(data, 'documentation.subordinationRisk') || "Medium; pari passu context"}</p>
              </div>
              <div className="p-4 bg-slate-50 border rounded-sm">
                 <h4 className="text-[9px] font-black uppercase text-slate-400 mb-2">Pricing Overview</h4>
                 <p className="text-sm font-bold">{data.facilityDetails?.rates?.margin || "Competitive IG O&G"}</p>
              </div>
           </div>
        </MemoSection>

        {/* Section J - Historical Financial Performance */}
        <MemoSection id="J" title="Historical Financial Performance">
           <div className="space-y-6">
              <div className="bg-white p-6 border rounded-sm shadow-sm">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Revenue + EBITDA YoY, Leverage Path</h4>
                 <SmartNarrative text={data.analysis?.financial?.moodyAnalysis} files={files} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 border bg-slate-50">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Liquidity Levels</h4>
                   <p className="text-sm font-sans">{data.analysis?.financial?.liquidity || "N/A"}</p>
                </div>
                <div className="p-6 border bg-slate-50">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Operating Cost & Efficiency Commentary</h4>
                   <p className="text-sm leading-relaxed font-sans">{data.analysis?.financial?.operatingCosts || "N/A"}</p>
                </div>
              </div>
              <div className="p-4 border border-slate-100 bg-slate-50 text-center text-[10px] text-slate-400 font-bold uppercase">
                [Insert Original Financial Performance Chart/Image]
              </div>
           </div>
        </MemoSection>

        {/* Section K - Budget & Sensitivity */}
        <MemoSection id="K" title="Budget & Sensitivity">
           <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 border rounded-sm">
                 <h4 className="text-[10px] font-black text-tdgreen uppercase mb-3 tracking-widest">Base Case</h4>
                 <p className="text-xs leading-relaxed font-sans">{data.analysis?.sensitivity?.baseCase || "Production, asset sales, leverage trajectory"}</p>
              </div>
              <div className="p-6 bg-rose-50 border border-rose-100 rounded-sm">
                 <h4 className="text-[10px] font-black text-rose-600 uppercase mb-3 tracking-widest">Downside Scenario</h4>
                 <p className="text-xs leading-relaxed font-sans">{data.analysis?.sensitivity?.downsideCase || "Lower prices/volumes; leverage peak, recovery path"}</p>
              </div>
              <div className="col-span-full p-4 bg-white border border-slate-200">
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Key Assumptions</h4>
                <p className="text-xs">{data.analysis?.sensitivity?.assumptions || "Revenue/EBITDA, WC, capex, M&A, synergies"}</p>
              </div>
              <div className="col-span-full p-4 border border-slate-100 bg-slate-50 text-center text-[10px] text-slate-400 font-bold uppercase">
                [Insert Scenario/Sensitivity Image (if present)]
              </div>
           </div>
        </MemoSection>

        {/* Section L - BRR & Public Ratings */}
        <MemoSection id="L" title="BRR & Public Ratings">
           <div className="space-y-6">
              <div className="flex gap-8 items-center bg-slate-50 p-6 rounded-xl border">
                 <div className="text-center px-4">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1">CLRA/BRR</p>
                    <p className="text-2xl font-black text-slate-900">{data.riskAssessment?.borrowerRating?.proposedBrr || "3B (Downgraded)"}</p>
                 </div>
                 <div className="flex-1 border-l pl-8">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Public ratings watch</h4>
                    <div className="flex gap-10">
                       {data.riskAssessment?.publicRatings?.map((r, i) => (
                          <div key={i}>
                             <p className="text-[10px] font-black">{r.agency}</p>
                             <p className="text-xs font-bold text-slate-600">{r.issuerRating || "Moody's (Watch Neg)"} ({r.outlook || "Negative Watch"})</p>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
              <div className="p-4 bg-white border italic text-slate-600">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Proposed rating rationale</h4>
                 <p className="text-sm">Rationale based on scale, assets, and deleveraging plan.</p>
              </div>
           </div>
        </MemoSection>

        {/* Section M - Key Business/Industry Risks */}
        <MemoSection id="M" title="Key Business/Industry Risks">
           <ul className="list-disc pl-5 space-y-2 text-sm font-bold text-slate-700">
             <li>Elevated leverage and repayment trajectory</li>
             <li>Integration risk from M&A activities</li>
             <li>Commodity price volatility and hedging effectiveness</li>
             <li>Environmental, social, and regulatory considerations (ESG)</li>
             <li>International exposure mix and geopolitical factors</li>
           </ul>
        </MemoSection>

        {/* Section N - Summary of Key Risks & Mitigants */}
        <MemoSection id="N" title="Summary of Key Risks & Mitigants">
           <div className="p-6 bg-slate-50 border rounded-sm">
              <p className="text-sm italic text-slate-400 text-center">Summary of key risks (Leverage, Integration, Price) and their respective mitigants (Cash Flow, Scale, Plan).</p>
           </div>
        </MemoSection>

        {/* Section O - Managing Director Comments */}
        <MemoSection id="O" title="Managing Director Comments">
           <div className="bg-tdgreen p-10 text-white rounded-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3L21.017 3V15C21.017 18.3137 18.3307 21 15.017 21H14.017ZM3 21L3 18C3 16.8954 3.89543 16 5 16H8C8.55228 16 9 15.5523 9 15V9C9 8.44772 8.55228 8 8 8H5C3.89543 8 3 7.10457 3 6V3L10 3V15C10 18.3137 7.31371 21 4 21H3Z" /></svg>
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-70">Manager Endorsement</h4>
              <p className="text-xl font-medium leading-relaxed italic relative z-10">{data.analysis?.justification?.mdComments || "Strategic opportunity; elevated risks mitigated by scale, assets, plan, and team. Recommendation: Approve, subject to stated conditions and monitoring."}</p>
              <div className="mt-8 pt-8 border-t border-white/20">
                 <p className="text-sm font-black uppercase tracking-widest">{data.analysis?.justification?.executivesSupporting || "Senior TDS Executives Supporting"}</p>
                 <p className="text-[10px] font-bold opacity-60">Global Banking & Markets</p>
              </div>
           </div>
        </MemoSection>
        
        <div className="text-center py-20 border-t border-slate-100 mt-20">
           <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.5em]">End of Executive Credit Memo</p>
        </div>
      </div>
    );
  }

  // Fallback helper for standard form sections
  const wrapInput = (label: string, path: string, type = "text") => (
    <div className="space-y-1.5">
      <div className="flex items-center">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <SourceBadge source={data.fieldSources?.[path]} />
      </div>
      <input
        type={type}
        value={getNested(data, path) || ''}
        onChange={(e) => setNested(path, type === "number" ? Number(e.target.value) : e.target.value)}
        className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-4 focus:ring-tdgreen/10 focus:border-tdgreen outline-none transition-all shadow-sm font-medium text-sm"
      />
    </div>
  );

  const wrapTextArea = (label: string, path: string, rows = 4) => (
    <div className="space-y-1.5 col-span-full">
      <div className="flex items-center">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <SourceBadge source={data.fieldSources?.[path]} />
      </div>
      <textarea
        rows={rows}
        value={getNested(data, path) || ''}
        onChange={(e) => setNested(path, e.target.value)}
        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-4 focus:ring-tdgreen/10 focus:border-tdgreen outline-none transition-all resize-none shadow-sm text-sm leading-relaxed"
      />
    </div>
  );

  const wrapCheckbox = (label: string, path: string) => (
    <label className="flex items-center gap-4 p-5 rounded-xl border border-slate-100 hover:border-tdgreen/20 hover:bg-tdgreen-light/30 cursor-pointer transition-all shadow-sm bg-white group">
      <input type="checkbox" checked={!!getNested(data, path)} onChange={(e) => setNested(path, e.target.checked)} className="w-6 h-6 text-tdgreen rounded-lg border-slate-300 focus:ring-tdgreen transition-all" />
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </label>
  );

  switch (section) {
    case 'borrower_details':
      return (
        <div className="grid grid-cols-2 gap-8">
          {wrapInput("Borrower Name", "primaryBorrower.borrowerName")}
          {wrapInput("Group", "primaryBorrower.group")}
          {wrapInput("Originating Office", "primaryBorrower.originatingOffice")}
          {wrapInput("Account Classification", "primaryBorrower.accountClassification")}
          {wrapInput("Customer Since", "counterparty.info.customerSince")}
          <div className="col-span-full text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] border-b pb-2 mb-4">Leveraged Lending Flags</div>
          <div className="col-span-full grid grid-cols-3 gap-5">
            {wrapCheckbox("Leveraged Lending", "primaryBorrower.leveragedLending")}
            {wrapCheckbox("Regulatory Leveraged", "primaryBorrower.regulatoryLeveragedLoan")}
            {wrapCheckbox("TDS Leveraged Loan", "primaryBorrower.tdsLeveragedLoan")}
            {wrapCheckbox("High Leverage (>5.5x)", "primaryBorrower.highLeverageLoan")}
            {wrapCheckbox("Extreme Leverage (>6.0x)", "primaryBorrower.extremeLeverage")}
            {wrapCheckbox("Covenant Lite", "primaryBorrower.covenantLite")}
            {wrapCheckbox("High Risk Account", "primaryBorrower.highRiskAccount")}
            {wrapCheckbox("Spotlight Account", "primaryBorrower.spotlightAccount")}
            {wrapCheckbox("CB Credit Standards Exception", "primaryBorrower.creditException")}
            {wrapCheckbox("Weak Underwriting", "primaryBorrower.weakUnderwriting")}
            {wrapCheckbox("Euro Infrastructure Sub Limit", "primaryBorrower.euroInfraLimit")}
            {wrapCheckbox("HRSL Sub Limit", "primaryBorrower.hrslSubLimit")}
            {wrapCheckbox("CMT Strategic Limit", "primaryBorrower.cmtStrategicLimit")}
            {wrapCheckbox("ESG Strategic Limit", "primaryBorrower.esgStrategicLimit")}
          </div>
          {wrapInput("SEA Score", "primaryBorrower.seaScore")}
        </div>
      );
    case 'purpose':
      return (
        <div className="grid grid-cols-2 gap-8">
          {wrapTextArea("Business Purpose", "purpose.businessPurpose")}
          {wrapTextArea("Adjudication Considerations", "purpose.adjudicationConsiderations")}
          {wrapInput("Annual Review Status", "purpose.annualReviewStatus")}
          {wrapInput("Sponsor Purchase (Value, Closing)", "purpose.sponsorPurchase")}
          {wrapInput("Arrangers / Agents", "purpose.arrangers")}
          {wrapInput("Syndicated Facilities", "purpose.syndicatedFacilities")}
          {wrapInput("Funding Mix", "purpose.fundingMix")}
          <div className="col-span-full grid grid-cols-3 gap-5">
            {wrapCheckbox("New Facilities", "purpose.reviewPurpose.newFacilities")}
            {wrapCheckbox("Financial Covenants", "purpose.reviewPurpose.financialCovenants")}
            {wrapCheckbox("Maturity Dates", "purpose.reviewPurpose.maturityDates")}
          </div>
        </div>
      );
    case 'credit_exposure':
      return (
        <div className="grid grid-cols-3 gap-6">
          {wrapInput("Requested", "creditPosition.creditRequested", "number")}
          {wrapInput("Hold Commitment", "creditPosition.holdCommitment")}
          {wrapInput("Warehouse Line", "creditPosition.warehouseRequest")}
          {wrapInput("Subgroup", "creditPosition.subgroup")}
          {wrapInput("Underwriting Commitment", "creditPosition.underwritingCommitment")}
          {wrapInput("Expected Time to Zero-Hold", "creditPosition.timeToZeroHold")}
          {wrapTextArea("Exposure Excess Details", "creditPosition.groupExposureStatus")}
        </div>
      );
    case 'financials_raroc':
      return (
        <div className="space-y-10">
          <div className="bg-tdgreen rounded-3xl p-10 text-white grid grid-cols-3 gap-8 shadow-xl shadow-tdgreen/10">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Economic RAROC %</span>
              <input type="number" className="bg-transparent text-white text-4xl font-black w-full outline-none mt-2" value={getNested(data, 'financialInfo.raroc.economicRaroc')} onChange={e => setNested('financialInfo.raroc.economicRaroc', Number(e.target.value))} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Relationship RAROC %</span>
              <input type="number" className="bg-transparent text-white text-4xl font-black w-full outline-none mt-2" value={getNested(data, 'financialInfo.raroc.relationshipRaroc')} onChange={e => setNested('financialInfo.raroc.relationshipRaroc', Number(e.target.value))} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Credit-Only RAROC %</span>
              <input type="number" className="bg-transparent text-white text-4xl font-black w-full outline-none mt-2" value={getNested(data, 'financialInfo.raroc.creditOnlyRaroc')} onChange={e => setNested('financialInfo.raroc.creditOnlyRaroc', Number(e.target.value))} />
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
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight border-b pb-2">Borrower Rating</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {wrapInput("TD BRR Proposed", "riskAssessment.borrowerRating.proposedBrr")}
              {wrapInput("TD FRR Proposed", "riskAssessment.borrowerRating.proposedFrr")}
              {wrapInput("TD BRR Current", "riskAssessment.borrowerRating.currentBrr")}
              {wrapInput("Risk Analyst", "riskAssessment.borrowerRating.riskAnalyst")}
              {wrapInput("New RA / Policy", "riskAssessment.borrowerRating.newRaPolicy")}
              {wrapInput("RA / Policy Model", "riskAssessment.borrowerRating.raPolicyModel")}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight border-b pb-2">Agency Rating</h3>
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
                  {(data.riskAssessment?.publicRatings || []).map((rating, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="p-4 font-black text-slate-800 text-sm">{rating.agency}</td>
                      <td className="p-2"><input type="text" value={rating.issuerRating || ''} onChange={(e) => {
                        const r = [...(data.riskAssessment?.publicRatings || [])];
                        r[i].issuerRating = e.target.value;
                        setNested('riskAssessment.publicRatings', r);
                      }} className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-tdgreen focus:bg-white rounded-lg outline-none font-bold text-sm" /></td>
                      <td className="p-2"><input type="text" value={rating.seniorUnsecured || ''} onChange={(e) => {
                        const r = [...(data.riskAssessment?.publicRatings || [])];
                        r[i].seniorUnsecured = e.target.value;
                        setNested('riskAssessment.publicRatings', r);
                      }} className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-tdgreen focus:bg-white rounded-lg outline-none font-bold text-sm" /></td>
                      <td className="p-2"><input type="text" value={rating.outlook || ''} onChange={(e) => {
                        const r = [...(data.riskAssessment?.publicRatings || [])];
                        r[i].outlook = e.target.value;
                        setNested('riskAssessment.publicRatings', r);
                      }} className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-tdgreen focus:bg-white rounded-lg outline-none font-bold text-sm" /></td>
                      <td className="p-2"><input type="text" value={rating.updatedAt || ''} onChange={(e) => {
                        const r = [...(data.riskAssessment?.publicRatings || [])];
                        r[i].updatedAt = e.target.value;
                        setNested('riskAssessment.publicRatings', r);
                      }} className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 focus:border-tdgreen focus:bg-white rounded-lg outline-none font-bold text-sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    case 'facility_info':
      return (
        <div className="space-y-10">
           <div className="grid grid-cols-4 gap-6">
             {wrapInput("Margin", "facilityDetails.rates.margin")}
             {wrapInput("Commitment Fee", "facilityDetails.rates.commitmentFee")}
             {wrapInput("Underwriting Fee", "facilityDetails.rates.underwritingFee")}
             {wrapInput("Undrawn Fee", "facilityDetails.rates.undrawnFee")}
           </div>
           <div className="grid grid-cols-3 gap-6">
             {wrapInput("Tenor", "facilityDetails.terms.tenor")}
             {wrapInput("Maturity", "facilityDetails.terms.maturity")}
             {wrapTextArea("Repayment Analysis", "facilityDetails.terms.repaymentAnalysis")}
           </div>
        </div>
      );
    case 'documentation_covenants':
      return (
        <div className="grid grid-cols-2 gap-8">
          {wrapInput("Agreement Type", "documentation.agreementType")}
          {wrapInput("Jurisdiction", "documentation.jurisdiction")}
          {wrapInput("Subordination Risk", "documentation.subordinationRisk")}
          {wrapTextArea("Financial Covenants", "documentation.financialCovenants")}
          {wrapTextArea("Protections (JCrew/Serta/Chewy)", "documentation.jCrewProvisions")}
          {wrapTextArea("Negative Covenants", "documentation.negativeCovenants")}
          {wrapTextArea("Positive Covenants", "documentation.positiveCovenants")}
          {wrapTextArea("Reporting Requirements", "documentation.reportingReqs")}
          {wrapTextArea("Funding conditions", "documentation.fundingConditions")}
        </div>
      );
    case 'analysis_narrative':
      return (
        <div className="space-y-12">
          {wrapTextArea("MD Comments / Endorsement", "analysis.justification.mdComments", 6)}
          {wrapTextArea("Executive Recommendation Summary", "analysis.justification.recommendation", 6)}
          {wrapInput("Executives Supporting", "analysis.justification.executivesSupporting")}
          <div className="grid grid-cols-2 gap-8">
            {wrapTextArea("Company Overview", "analysis.overview.companyDesc", 6)}
            {wrapTextArea("Sponsor Overview", "analysis.overview.sponsorOverview", 6)}
          </div>
          <div className="grid grid-cols-2 gap-8">
            {wrapInput("Reporting Segments", "analysis.overview.segments")}
            {wrapInput("Geographic Presence", "analysis.overview.geography")}
            {wrapInput("End Customer Profile", "analysis.overview.industryProfile")}
            {wrapInput("LTM Rev, EBITDA, Margin", "analysis.overview.ltmMetrics")}
          </div>
          <div className="grid grid-cols-2 gap-8">
            {wrapTextArea("Valuation Approach", "analysis.valuation.approach", 4)}
            {wrapInput("Pro Forma Reserves & Production", "analysis.valuation.reserves")}
            {wrapTextArea("Peer Comparison / Multiples", "analysis.valuation.peerComp", 4)}
            {wrapTextArea("Sources & Uses Narrative", "analysis.overview.sourcesUses", 4)}
          </div>
          <div className="grid grid-cols-2 gap-8">
            {wrapTextArea("Historical Financial Overview", "analysis.financial.moodyAnalysis", 6)}
            {wrapTextArea("Liquidity Analysis", "analysis.financial.liquidity", 4)}
            {wrapTextArea("Operating Cost Commentary", "analysis.financial.operatingCosts", 4)}
          </div>
          <div className="grid grid-cols-2 gap-8">
            {wrapTextArea("Base Case Scenario", "analysis.sensitivity.baseCase", 6)}
            {wrapTextArea("Downside Scenario", "analysis.sensitivity.downsideCase", 6)}
            {wrapTextArea("Key Assumptions", "analysis.sensitivity.assumptions", 4)}
          </div>
        </div>
      );
    case 'compliance_signoff':
      return (
        <div className="grid grid-cols-2 gap-8">
           {wrapInput("Approver", "compliance.signOff.approver")}
           {wrapInput("Date", "compliance.signOff.date")}
        </div>
      );
    case 'source_documents':
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
    case 'document_preview':
      return (
        <div className="max-w-4xl mx-auto space-y-12 py-10 print:p-0 relative font-serif">
          <div className="border-b-8 border-tdgreen pb-10 text-center">
            <div className="inline-block px-4 py-2 bg-slate-900 text-white font-black text-xs uppercase mb-4">Confidential Draft</div>
            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Final credit memo initial draft</h1>
            <p className="text-slate-500 font-bold mt-2 text-sm uppercase">Consolidated Lending Profile • Institutional CIB</p>
          </div>

          <section>
            <PreviewHeader title="1. Borrower Details" />
            <div className="grid grid-cols-2 gap-x-12 px-6">
              <DataRow label="Legal Name" value={getNested(data, 'primaryBorrower.borrowerName')} path="primaryBorrower.borrowerName" />
              <DataRow label="Group" value={getNested(data, 'primaryBorrower.group')} path="primaryBorrower.group" />
              <DataRow label="Originating Office" value={getNested(data, 'primaryBorrower.originatingOffice')} path="primaryBorrower.originatingOffice" />
              <DataRow label="Classification" value={getNested(data, 'primaryBorrower.accountClassification')} path="primaryBorrower.accountClassification" />
              <DataRow label="Customer Since" value={getNested(data, 'counterparty.info.customerSince')} path="counterparty.info.customerSince" />
              <DataRow label="SEA Score" value={getNested(data, 'primaryBorrower.seaScore')} path="primaryBorrower.seaScore" />
            </div>
            <div className="px-6 mt-4 grid grid-cols-3 gap-2">
               <FlagRow label="Leveraged" value={getNested(data, 'primaryBorrower.leveragedLending')} />
               <FlagRow label="Covenant-Lite" value={getNested(data, 'primaryBorrower.covenantLite')} />
               <FlagRow label="Regulatory LL" value={getNested(data, 'primaryBorrower.regulatoryLeveragedLoan')} />
            </div>
          </section>

          <section>
            <PreviewHeader title="2. Purpose & Review" />
            <PreviewTextArea label="Strategic Business Purpose" value={getNested(data, 'purpose.businessPurpose')} path="purpose.businessPurpose" />
            <div className="grid grid-cols-2 gap-x-12 px-6">
              <DataRow label="Annual Review Status" value={getNested(data, 'purpose.annualReviewStatus')} path="purpose.annualReviewStatus" />
              <DataRow label="Funding Mix" value={getNested(data, 'purpose.fundingMix')} path="purpose.fundingMix" />
              <DataRow label="Arrangers" value={getNested(data, 'purpose.arrangers')} path="purpose.arrangers" />
            </div>
          </section>

          <section>
            <PreviewHeader title="3. Credit & Exposure" />
            <div className="grid grid-cols-2 gap-x-12 px-6">
              <DataRow label="Requested" value={`$${(getNested(data, 'creditPosition.creditRequested') || 0).toLocaleString()}`} path="creditPosition.creditRequested" />
              <DataRow label="Hold Commitment" value={getNested(data, 'creditPosition.holdCommitment')} path="creditPosition.holdCommitment" />
              <DataRow label="Warehouse Line" value={getNested(data, 'creditPosition.warehouseRequest')} path="creditPosition.warehouseRequest" />
              <DataRow label="Subgroup" value={getNested(data, 'creditPosition.subgroup')} path="creditPosition.subgroup" />
              <DataRow label="U/W Commitment" value={getNested(data, 'creditPosition.underwritingCommitment')} path="creditPosition.underwritingCommitment" />
              <DataRow label="Time to Zero-Hold" value={getNested(data, 'creditPosition.timeToZeroHold')} path="creditPosition.timeToZeroHold" />
            </div>
          </section>

          <section>
            <PreviewHeader title="4. Financials & RAROC" />
            <div className="grid grid-cols-3 gap-4 px-6 text-center">
               <div className="p-4 bg-slate-50 border border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Economic RAROC</p>
                  <p className="text-xl font-black">{getNested(data, 'financialInfo.raroc.economicRaroc')}%</p>
               </div>
               <div className="p-4 bg-slate-50 border border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Rel. RAROC</p>
                  <p className="text-xl font-black">{getNested(data, 'financialInfo.raroc.relationshipRaroc')}%</p>
               </div>
               <div className="p-4 bg-slate-50 border border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Credit-Only RAROC</p>
                  <p className="text-xl font-black">{getNested(data, 'financialInfo.raroc.creditOnlyRaroc')}%</p>
               </div>
            </div>
          </section>

          <section>
            <PreviewHeader title="5. Risk & Ratings" />
            <div className="px-6 space-y-6">
              <div className="grid grid-cols-2 gap-x-12">
                 <DataRow label="Proposed BRR" value={getNested(data, 'riskAssessment.borrowerRating.proposedBrr')} path="riskAssessment.borrowerRating.proposedBrr" />
                 <DataRow label="Proposed FRR" value={getNested(data, 'riskAssessment.borrowerRating.proposedFrr')} path="riskAssessment.borrowerRating.proposedFrr" />
                 <DataRow label="Current BRR" value={getNested(data, 'riskAssessment.borrowerRating.currentBrr')} path="riskAssessment.borrowerRating.currentBrr" />
                 <DataRow label="Risk Analyst" value={getNested(data, 'riskAssessment.borrowerRating.riskAnalyst')} path="riskAssessment.borrowerRating.riskAnalyst" />
              </div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Agency Ratings</h4>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                 <table className="w-full text-left border-collapse text-xs">
                   <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3 font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Agency</th>
                        <th className="p-3 font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Issuer Rating</th>
                        <th className="p-3 font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Outlook</th>
                      </tr>
                   </thead>
                   <tbody>
                      {(data.riskAssessment?.publicRatings || []).map((rating, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0 font-bold">
                          <td className="p-3 text-slate-900">{rating.agency}</td>
                          <td className="p-3 text-slate-700">{rating.issuerRating || "N/A"}</td>
                          <td className="p-3 text-slate-700">{rating.outlook || "N/A"}</td>
                        </tr>
                      ))}
                   </tbody>
                 </table>
              </div>
            </div>
          </section>

          <section>
            <PreviewHeader title="6. Facility Details" />
            <div className="grid grid-cols-2 gap-x-12 px-6">
              <DataRow label="Margin" value={getNested(data, 'facilityDetails.rates.margin')} path="facilityDetails.rates.margin" />
              <DataRow label="U/W Fee" value={getNested(data, 'facilityDetails.rates.underwritingFee')} path="facilityDetails.rates.underwritingFee" />
              <DataRow label="Tenor" value={getNested(data, 'facilityDetails.terms.tenor')} path="facilityDetails.terms.tenor" />
              <DataRow label="Maturity" value={getNested(data, 'facilityDetails.terms.maturity')} path="facilityDetails.terms.maturity" />
            </div>
            <PreviewTextArea label="Repayment Analysis" value={getNested(data, 'facilityDetails.terms.repaymentAnalysis')} path="facilityDetails.terms.repaymentAnalysis" />
          </section>

          <section>
            <PreviewHeader title="7. Legal & Covenants" />
            <div className="grid grid-cols-2 gap-x-12 px-6">
              <DataRow label="Agreement Type" value={getNested(data, 'documentation.agreementType')} path="documentation.agreementType" />
              <DataRow label="Jurisdiction" value={getNested(data, 'documentation.jurisdiction')} path="documentation.jurisdiction" />
              <DataRow label="Subordination Risk" value={getNested(data, 'documentation.subordinationRisk')} path="documentation.subordinationRisk" />
            </div>
            <PreviewTextArea label="Financial Covenants" value={getNested(data, 'documentation.financialCovenants')} path="documentation.financialCovenants" />
            <PreviewTextArea label="Lender Protections (J.Crew/Serta)" value={getNested(data, 'documentation.jCrewProvisions')} path="documentation.jCrewProvisions" />
          </section>

          <section>
            <PreviewHeader title="8. Analysis Overview" />
            <div className="px-6 space-y-6">
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Company & Industry Overview</h4>
                <SmartNarrative text={getNested(data, 'analysis.overview.companyDesc')} files={files} />
              </div>
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Historical Financial Analysis</h4>
                <SmartNarrative text={getNested(data, 'analysis.financial.moodyAnalysis')} files={files} />
              </div>
            </div>
          </section>

          <section>
            <PreviewHeader title="9. Valuation Analysis" />
            <div className="grid grid-cols-2 gap-x-12 px-6 mb-4">
              <DataRow label="Valuation Approach" value={getNested(data, 'analysis.valuation.approach')} path="analysis.valuation.approach" />
              <DataRow label="Pro Forma Reserves" value={getNested(data, 'analysis.valuation.reserves')} path="analysis.valuation.reserves" />
            </div>
            <div className="px-6">
               <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Peer Multiples & Comparable Analysis</h4>
                 <SmartNarrative text={getNested(data, 'analysis.valuation.peerComp')} files={files} />
               </div>
            </div>
          </section>

          <section>
            <PreviewHeader title="10. Budget & Sensitivity" />
            <div className="grid grid-cols-2 gap-8 px-6">
               <div className="p-6 border border-tdgreen/20 rounded-2xl bg-tdgreen/5">
                  <h4 className="text-[10px] font-black text-tdgreen uppercase mb-2">Base Case</h4>
                  <p className="text-sm italic">{getNested(data, 'analysis.sensitivity.baseCase') || "N/A"}</p>
               </div>
               <div className="p-6 border border-rose-200 rounded-2xl bg-rose-50">
                  <h4 className="text-[10px] font-black text-rose-600 uppercase mb-2">Downside Scenario</h4>
                  <p className="text-sm italic">{getNested(data, 'analysis.sensitivity.downsideCase') || "N/A"}</p>
               </div>
            </div>
          </section>

          <section>
            <PreviewHeader title="11. Strategic Recommendation" />
            <PreviewTextArea label="Analyst Recommendation Summary" value={getNested(data, 'analysis.justification.recommendation')} path="analysis.justification.recommendation" />
            <div className="px-6">
              <div className="bg-slate-900 text-white p-10 rounded-2xl shadow-xl italic font-medium leading-relaxed">
                 {getNested(data, 'analysis.justification.mdComments') || "MD Comments pending..."}
              </div>
            </div>
          </section>

          <section>
            <PreviewHeader title="12. Sign-off & Compliance" />
            <div className="grid grid-cols-2 gap-x-12 px-6">
              <DataRow label="Authorized By" value={getNested(data, 'compliance.signOff.approver')} path="compliance.signOff.approver" />
              <DataRow label="Final Draft Date" value={getNested(data, 'compliance.signOff.date')} path="compliance.signOff.date" />
            </div>
          </section>

          <div className="text-center py-20 border-t border-slate-100 mt-20">
             <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.5em]">End of consolidated memo draft</p>
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default SectionRenderer;