/*
# Cadence Schema — Table Creation Only

Creates all tables, indexes, triggers, and storage buckets.
Policies are added in a separate migration to avoid cross-table reference issues.
*/

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  team_size text DEFAULT '1-5',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ORGANIZATION_MEMBERS
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_email text DEFAULT '',
  is_repeat boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CONTRACTS
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text DEFAULT 'application/pdf',
  page_count integer DEFAULT 0,
  status text DEFAULT 'uploaded',
  processing_stage text DEFAULT '',
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CONTRACT_PAGES
CREATE TABLE IF NOT EXISTS contract_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  extraction_status text DEFAULT 'pending',
  extraction_method text DEFAULT '',
  text_content text DEFAULT '',
  char_count integer DEFAULT 0,
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(contract_id, page_number)
);

-- CONTRACT_CHUNKS
CREATE TABLE IF NOT EXISTS contract_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  page_start integer NOT NULL,
  page_end integer NOT NULL,
  section text DEFAULT '',
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- CONTRACT_TERMS
CREATE TABLE IF NOT EXISTS contract_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  term_key text NOT NULL,
  term_value text DEFAULT '',
  status text DEFAULT 'not_found',
  confidence text DEFAULT 'medium',
  source_page integer,
  source_section text DEFAULT '',
  source_text text DEFAULT '',
  confirmed boolean DEFAULT false,
  edited_value text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CONTRACT_FINDINGS
CREATE TABLE IF NOT EXISTS contract_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  severity text NOT NULL DEFAULT 'medium',
  description text DEFAULT '',
  source_page integer,
  source_section text DEFAULT '',
  source_text text DEFAULT '',
  confidence text DEFAULT 'medium',
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- CONTRACT_ANALYSIS_RUNS
CREATE TABLE IF NOT EXISTS contract_analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  stage text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  duration_ms integer DEFAULT 0,
  details jsonb DEFAULT '{}',
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  file_name text DEFAULT '',
  file_path text DEFAULT '',
  file_size bigint DEFAULT 0,
  invoice_number text DEFAULT '',
  amount numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  issue_date date,
  due_date date,
  description text DEFAULT '',
  status text DEFAULT 'uploaded',
  payment_status text DEFAULT 'unpaid',
  paid_date date,
  extraction_status text DEFAULT 'pending',
  confirmed boolean DEFAULT false,
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- INVOICE_ANALYSIS
CREATE TABLE IF NOT EXISTS invoice_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  risk_level text DEFAULT 'unknown',
  recommendation text DEFAULT '',
  recommended_action text DEFAULT '',
  recommended_tone text DEFAULT '',
  explanation text DEFAULT '',
  evidence jsonb DEFAULT '[]',
  tone_reason text DEFAULT '',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(invoice_id)
);

-- PAYMENT_EVENTS
CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'payment_recorded',
  amount numeric(12,2) DEFAULT 0,
  paid_date date,
  days_late integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- PAYMENT_PROMISES
CREATE TABLE IF NOT EXISTS payment_promises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  promised_date date NOT NULL,
  status text DEFAULT 'pending',
  source text DEFAULT 'manual',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CLIENT_TONES
CREATE TABLE IF NOT EXISTS client_tones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  selected_tone text DEFAULT 'casual_friendly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id)
);

-- EMAIL_DRAFTS
CREATE TABLE IF NOT EXISTS email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  tone text DEFAULT 'casual_friendly',
  tone_reason text DEFAULT '',
  status text DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ACTIVITY_EVENTS
CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_title text NOT NULL,
  event_description text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text DEFAULT '',
  type text DEFAULT 'info',
  link text DEFAULT '',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tones ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org_id ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contract_pages_contract_id ON contract_pages(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_chunks_contract_id ON contract_chunks(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_terms_contract_id ON contract_terms(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_findings_contract_id ON contract_findings(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_runs_contract_id ON contract_analysis_runs(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_analysis_invoice_id ON invoice_analysis(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_invoice_id ON payment_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_promises_invoice_id ON payment_promises(invoice_id);
CREATE INDEX IF NOT EXISTS idx_client_tones_client_id ON client_tones(client_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_invoice_id ON email_drafts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_org_id ON activity_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_client_id ON activity_events(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- HANDLE_NEW_USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- UPDATED_AT HELPER
CREATE OR REPLACE FUNCTION public.update_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS contracts_updated_at ON contracts;
CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS invoice_analysis_updated_at ON invoice_analysis;
CREATE TRIGGER invoice_analysis_updated_at BEFORE UPDATE ON invoice_analysis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS client_tones_updated_at ON client_tones;
CREATE TRIGGER client_tones_updated_at BEFORE UPDATE ON client_tones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS email_drafts_updated_at ON email_drafts;
CREATE TRIGGER email_drafts_updated_at BEFORE UPDATE ON email_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS payment_promises_updated_at ON payment_promises;
CREATE TRIGGER payment_promises_updated_at BEFORE UPDATE ON payment_promises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false) ON CONFLICT DO NOTHING;
