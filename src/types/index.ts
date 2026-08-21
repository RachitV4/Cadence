export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  team_size: string;
  created_by: string | null;
  created_at: string;
  slack_webhook_url?: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  contact_email: string;
  is_repeat: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  client_id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  page_count: number;
  status: string;
  processing_stage: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface ContractPage {
  id: string;
  contract_id: string;
  page_number: number;
  extraction_status: string;
  extraction_method: string;
  text_content: string;
  char_count: number;
  error_message: string;
  created_at: string;
}

export interface ContractChunk {
  id: string;
  contract_id: string;
  chunk_index: number;
  page_start: number;
  page_end: number;
  section: string;
  text: string;
  created_at: string;
}

export interface ContractTerm {
  id: string;
  contract_id: string;
  term_key: string;
  term_value: string;
  status: string;
  confidence: string;
  source_page: number | null;
  source_section: string;
  source_text: string;
  confirmed: boolean;
  edited_value: string;
  created_at: string;
  updated_at: string;
}

export interface ContractFinding {
  id: string;
  contract_id: string;
  title: string;
  category: string;
  severity: string;
  description: string;
  source_page: number | null;
  source_section: string;
  source_text: string;
  confidence: string;
  dismissed: boolean;
  created_at: string;
}

export interface ContractAnalysisRun {
  id: string;
  contract_id: string;
  stage: string;
  status: string;
  duration_ms: number;
  details: Record<string, unknown>;
  error_message: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  organization_id: string;
  contract_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  invoice_number: string;
  amount: number;
  currency: string;
  issue_date: string | null;
  due_date: string | null;
  description: string;
  status: string;
  payment_status: string;
  paid_date: string | null;
  extraction_status: string;
  confirmed: boolean;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceAnalysis {
  id: string;
  invoice_id: string;
  risk_level: string;
  recommendation: string;
  recommended_action: string;
  recommended_tone: string;
  explanation: string;
  evidence: EvidenceItem[];
  tone_reason: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EvidenceItem {
  source: string;
  detail: string;
  reference?: string;
}

export interface PaymentEvent {
  id: string;
  invoice_id: string;
  organization_id: string;
  client_id: string;
  event_type: string;
  amount: number;
  paid_date: string | null;
  days_late: number;
  notes: string;
  created_at: string;
}

export interface PaymentPromise {
  id: string;
  invoice_id: string;
  organization_id: string;
  client_id: string;
  promised_date: string;
  status: string;
  source: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ClientTone {
  id: string;
  client_id: string;
  organization_id: string;
  selected_tone: string;
  created_at: string;
  updated_at: string;
}

export interface EmailDraft {
  id: string;
  invoice_id: string;
  organization_id: string;
  client_id: string;
  subject: string;
  body: string;
  tone: string;
  tone_reason: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  organization_id: string;
  client_id: string | null;
  contract_id: string | null;
  invoice_id: string | null;
  event_type: string;
  event_title: string;
  event_description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  title: string;
  body: string;
  type: string;
  link: string;
  read: boolean;
  created_at: string;
}

export type ToneKey = 'humble' | 'casual_friendly' | 'formal' | 'strict' | 'modest';

export interface ToneDefinition {
  key: ToneKey;
  name: string;
  description: string;
}

export const TONES: ToneDefinition[] = [
  { key: 'humble', name: 'Humble', description: 'Soft and deferential. Acknowledges the relationship without pressure.' },
  { key: 'casual_friendly', name: 'Casual / Friendly', description: 'Warm and conversational. Treats this like a normal check-in.' },
  { key: 'formal', name: 'Formal', description: 'Professional and structured. Clear references to terms and dates.' },
  { key: 'strict', name: 'Strict', description: 'Direct and firm. References obligations and consequences plainly.' },
  { key: 'modest', name: 'Modest', description: 'Measured and understated. States facts without insistence.' },
];

export const TERM_LABELS: Record<string, string> = {
  contract_type: 'Contract type',
  parties: 'Parties',
  effective_date: 'Effective date',
  expiration_date: 'Expiration date',
  contract_value: 'Contract value',
  payment_terms: 'Payment terms',
  late_fee: 'Late fee',
  milestones: 'Milestones',
  deadlines: 'Deadlines',
  termination: 'Termination',
  liability: 'Liability',
  ip: 'Intellectual property',
  renewal: 'Renewal',
  scope_change: 'Scope / change control',
  confidentiality: 'Confidentiality',
};

export const FINDING_CATEGORIES: Record<string, string> = {
  payment: 'Payment',
  scope: 'Scope',
  termination: 'Termination',
  liability: 'Liability',
  ip: 'IP',
  other: 'Other',
};
