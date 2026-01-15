
export interface SourceFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface PublicRating {
  agency: string;
  issuerRating: string;
  seniorUnsecured: string;
  outlook: string;
  updatedAt: string;
}

export type AiProvider = 'google' | 'openai';

export type AiModelId = 
  | 'gemini-3-flash-preview' 
  | 'gemini-3-pro-preview' 
  | 'gpt-4o' 
  | 'gpt-4o-mini'
  | 'gpt-5-preview';

export interface AiModel {
  id: AiModelId;
  provider: AiProvider;
  label: string;
  description: string;
  badge: string;
}

export interface FieldSource {
  filename: string;
  pageNumber: string;
}

export interface CreditMemoData {
  primaryBorrower: {
    borrowerName: string;
    originatingOffice: string;
    group: string;
    accountClassification: string;
    quarterlyReview: boolean;
    leveragedLending: boolean;
    strategicLoan: boolean;
    creditException: boolean;
    covenantLite: boolean;
    weakUnderwriting: boolean;
    tdsPolicyException: boolean;
    tdsLeveragedLoan: boolean;
    regulatoryLeveragedLoan: boolean;
    highLeverageLoan: boolean; // 5 rated > 5.5x
    leveragePolicyRoom: boolean;
    extremeLeverage: boolean; // > 6.0x
    hrslSubLimit: boolean;
    cmtStrategicLimit: boolean;
    esgStrategicLimit: boolean;
    euroInfraLimit: boolean;
    highRiskAccount: boolean;
    spotlightAccount: boolean;
    seaScore: string;
    additionalComments: string;
  };
  purpose: {
    businessPurpose: string;
    adjudicationConsiderations: string;
    annualReviewStatus: string;
    reviewPurpose: {
      newFacilities: boolean;
      financialCovenants: boolean;
      maturityDates: boolean;
    };
    sponsorPurchase: string;
    arrangers: string;
    syndicatedFacilities: string;
    fundingMix: string;
    additionalComments: string;
  };
  creditPosition: {
    previousAuthorization: number;
    presentPosition: number;
    creditRequested: number;
    committedOverOneYear: number;
    totalExcludingTrading: number;
    tradingLine: number;
    warehouseRequest: string;
    holdCommitment: string;
    subgroup: string;
    groupExposureStatus: string;
    underwritingCommitment: string;
    timeToZeroHold: string;
    additionalComments: string;
  };
  groupExposure: {
    entity: string;
    total: number;
    nonTrading: number;
    withinGuidelines: boolean;
    exposureGuidelines: string;
    totalExposure: number;
    excessDetails: string;
  }[];
  financialInfo: {
    covenants: { name: string; test: string }[];
    raroc: {
      lccStatus: string;
      economicRaroc: number;
      relationshipRaroc: number;
      creditOnlyRaroc: number;
      economicCapital: number;
    };
    additionalComments: string;
  };
  reviewDates: {
    newAnnualDate: string;
    authorizedDate: string;
    interimDate: string;
    comments: string;
  };
  counterparty: {
    ratings: { name: string; review: string; brr: string; ra: string; policy: string }[];
    info: {
      legalName: string;
      address: string;
      accountType: string;
      envRisk: string;
      countryInc: string;
      countryRevenue: string;
      established: string;
      customerSince: string;
      baselAdequacy: string;
    };
  };
  riskAssessment: {
    borrowerRating: {
      proposedBrr: string;
      proposedFrr: string;
      currentBrr: string;
      riskAnalyst: string;
      newRaPolicy: string;
      raPolicyModel: string;
    };
    publicRatings: PublicRating[];
    details: {
      tdSic: string;
      industryRisk: string;
      security: string;
      ltv: number;
      businessRisk: string;
      financialRisk: string;
      envRisk: string;
      countryRisk: string;
      governanceRisk: string;
      withinLimits: boolean;
    };
    additionalComments: string;
  };
  facilityDetails: {
    summaries: any[];
    tradingLines: { unhedged: number; bond: number; subtotal: number; total: number };
    options: { instruments: string; currencies: string; lcSublimit: number; competitiveAdvance: string };
    rates: { margin: string; fee: string; allIn: string; upfront: string; underwritingFee: string; commitmentFee: string; undrawnFee: string };
    terms: { tenor: string; maturity: string; extension: string; termOut: string; repaymentAnalysis: string; achievabilityTime: string };
    repayment: { amortizing: boolean; comments: string };
    prepayment: { permitted: boolean; comments: string };
    additionalComments: string;
  };
  documentation: {
    agreementType: string;
    date: string;
    status: string;
    amendments: string;
    comments: string;
    jurisdiction: string;
    waiverJuryTrial: boolean;
    negativeCovenants: string;
    positiveCovenants: string;
    financialCovenants: string;
    eventsOfDefault: string;
    reportingReqs: string;
    fundingConditions: string;
    jCrewProvisions: string;
    subordinationRisk: string;
    additionalComments: string;
  };
  analysis: {
    overview: { 
      companyDesc: string; 
      recentEvents: string; 
      sourcesUses: string; 
      financingPlan: string; 
      segments: string; 
      geography: string; 
      sponsorOverview: string;
      industryProfile: string;
      ltmMetrics: string;
    };
    financial: { 
      moodyAnalysis: string; 
      ratioAnalysis: string; 
      capStructure: string; 
      liquidity: string; 
      debtMaturity: string; 
      operatingCosts: string;
    };
    leverage: string;
    valuation: { 
      approach: string; 
      multiples: string; 
      reserves: string; 
      peerComp: string; 
    };
    sensitivity: { 
      baseCase: string; 
      downsideCase: string; 
      assumptions: string; 
    };
    justification: { 
      mraOutput: string; 
      peerComp: string; 
      fundamentals: string; 
      fcf: string; 
      recommendation: string; 
      mdComments: string; 
      executivesSupporting: string; 
    };
    additionalComments: string;
  };
  compliance: {
    signOff: { name: string; title: string; date: string; approver: string };
    legal: { declarationInterest: string; directors: string; illegalTying: string };
    additionalComments: string;
  };
  fieldSources?: Record<string, FieldSource>;
  [key: string]: any;
}

export type SectionKey = 
  | 'borrower_details'
  | 'purpose'
  | 'credit_exposure'
  | 'financials_raroc'
  | 'risk_ratings'
  | 'facility_info'
  | 'documentation_covenants'
  | 'analysis_narrative'
  | 'compliance_signoff'
  | 'source_documents'
  | 'document_preview'
  | 'executive_credit_memo';

export interface Section {
  id: SectionKey;
  label: string;
  icon: string;
  category: string;
}
