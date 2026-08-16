/*
# Cadence Schema — RLS Policies

All row-level security policies for multi-tenant isolation.
Organization-scoped tables check membership via organization_members.
*/

-- PROFILES (own user only)
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ORGANIZATIONS
DROP POLICY IF EXISTS "select_org_if_member" ON organizations;
CREATE POLICY "select_org_if_member" ON organizations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organizations.id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_org_as_creator" ON organizations;
CREATE POLICY "insert_org_as_creator" ON organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "update_org_if_member" ON organizations;
CREATE POLICY "update_org_if_member" ON organizations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organizations.id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organizations.id AND om.user_id = auth.uid()));

-- ORGANIZATION_MEMBERS
DROP POLICY IF EXISTS "select_org_membership" ON organization_members;
CREATE POLICY "select_org_membership" ON organization_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM organization_members om2 WHERE om2.organization_id = organization_members.organization_id AND om2.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_org_membership" ON organization_members;
CREATE POLICY "insert_org_membership" ON organization_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_org_membership" ON organization_members;
CREATE POLICY "delete_org_membership" ON organization_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- CLIENTS
DROP POLICY IF EXISTS "select_client_if_org_member" ON clients;
CREATE POLICY "select_client_if_org_member" ON clients FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = clients.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_client_if_org_member" ON clients;
CREATE POLICY "insert_client_if_org_member" ON clients FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = clients.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_client_if_org_member" ON clients;
CREATE POLICY "update_client_if_org_member" ON clients FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = clients.organization_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = clients.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_client_if_org_member" ON clients;
CREATE POLICY "delete_client_if_org_member" ON clients FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = clients.organization_id AND om.user_id = auth.uid()));

-- CONTRACTS
DROP POLICY IF EXISTS "select_contract_if_org_member" ON contracts;
CREATE POLICY "select_contract_if_org_member" ON contracts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = contracts.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_contract_if_org_member" ON contracts;
CREATE POLICY "insert_contract_if_org_member" ON contracts FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = contracts.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_contract_if_org_member" ON contracts;
CREATE POLICY "update_contract_if_org_member" ON contracts FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = contracts.organization_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = contracts.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_contract_if_org_member" ON contracts;
CREATE POLICY "delete_contract_if_org_member" ON contracts FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = contracts.organization_id AND om.user_id = auth.uid()));

-- CONTRACT_PAGES
DROP POLICY IF EXISTS "select_cpage_if_org_member" ON contract_pages;
CREATE POLICY "select_cpage_if_org_member" ON contract_pages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_pages.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_cpage_if_org_member" ON contract_pages;
CREATE POLICY "insert_cpage_if_org_member" ON contract_pages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_pages.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_cpage_if_org_member" ON contract_pages;
CREATE POLICY "update_cpage_if_org_member" ON contract_pages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_pages.contract_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_pages.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_cpage_if_org_member" ON contract_pages;
CREATE POLICY "delete_cpage_if_org_member" ON contract_pages FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_pages.contract_id AND om.user_id = auth.uid()));

-- CONTRACT_CHUNKS
DROP POLICY IF EXISTS "select_chunk_if_org_member" ON contract_chunks;
CREATE POLICY "select_chunk_if_org_member" ON contract_chunks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_chunks.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_chunk_if_org_member" ON contract_chunks;
CREATE POLICY "insert_chunk_if_org_member" ON contract_chunks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_chunks.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_chunk_if_org_member" ON contract_chunks;
CREATE POLICY "update_chunk_if_org_member" ON contract_chunks FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_chunks.contract_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_chunks.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_chunk_if_org_member" ON contract_chunks;
CREATE POLICY "delete_chunk_if_org_member" ON contract_chunks FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_chunks.contract_id AND om.user_id = auth.uid()));

-- CONTRACT_TERMS
DROP POLICY IF EXISTS "select_term_if_org_member" ON contract_terms;
CREATE POLICY "select_term_if_org_member" ON contract_terms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_terms.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_term_if_org_member" ON contract_terms;
CREATE POLICY "insert_term_if_org_member" ON contract_terms FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_terms.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_term_if_org_member" ON contract_terms;
CREATE POLICY "update_term_if_org_member" ON contract_terms FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_terms.contract_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_terms.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_term_if_org_member" ON contract_terms;
CREATE POLICY "delete_term_if_org_member" ON contract_terms FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_terms.contract_id AND om.user_id = auth.uid()));

-- CONTRACT_FINDINGS
DROP POLICY IF EXISTS "select_finding_if_org_member" ON contract_findings;
CREATE POLICY "select_finding_if_org_member" ON contract_findings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_findings.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_finding_if_org_member" ON contract_findings;
CREATE POLICY "insert_finding_if_org_member" ON contract_findings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_findings.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_finding_if_org_member" ON contract_findings;
CREATE POLICY "update_finding_if_org_member" ON contract_findings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_findings.contract_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_findings.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_finding_if_org_member" ON contract_findings;
CREATE POLICY "delete_finding_if_org_member" ON contract_findings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_findings.contract_id AND om.user_id = auth.uid()));

-- CONTRACT_ANALYSIS_RUNS
DROP POLICY IF EXISTS "select_run_if_org_member" ON contract_analysis_runs;
CREATE POLICY "select_run_if_org_member" ON contract_analysis_runs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_analysis_runs.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_run_if_org_member" ON contract_analysis_runs;
CREATE POLICY "insert_run_if_org_member" ON contract_analysis_runs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_analysis_runs.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_run_if_org_member" ON contract_analysis_runs;
CREATE POLICY "update_run_if_org_member" ON contract_analysis_runs FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_analysis_runs.contract_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_analysis_runs.contract_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_run_if_org_member" ON contract_analysis_runs;
CREATE POLICY "delete_run_if_org_member" ON contract_analysis_runs FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM contracts c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = contract_analysis_runs.contract_id AND om.user_id = auth.uid()));

-- INVOICES
DROP POLICY IF EXISTS "select_invoice_if_org_member" ON invoices;
CREATE POLICY "select_invoice_if_org_member" ON invoices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = invoices.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_invoice_if_org_member" ON invoices;
CREATE POLICY "insert_invoice_if_org_member" ON invoices FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = invoices.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_invoice_if_org_member" ON invoices;
CREATE POLICY "update_invoice_if_org_member" ON invoices FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = invoices.organization_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = invoices.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_invoice_if_org_member" ON invoices;
CREATE POLICY "delete_invoice_if_org_member" ON invoices FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = invoices.organization_id AND om.user_id = auth.uid()));

-- INVOICE_ANALYSIS
DROP POLICY IF EXISTS "select_ianalysis_if_org_member" ON invoice_analysis;
CREATE POLICY "select_ianalysis_if_org_member" ON invoice_analysis FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM invoices i JOIN organization_members om ON om.organization_id = i.organization_id WHERE i.id = invoice_analysis.invoice_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_ianalysis_if_org_member" ON invoice_analysis;
CREATE POLICY "insert_ianalysis_if_org_member" ON invoice_analysis FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM invoices i JOIN organization_members om ON om.organization_id = i.organization_id WHERE i.id = invoice_analysis.invoice_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_ianalysis_if_org_member" ON invoice_analysis;
CREATE POLICY "update_ianalysis_if_org_member" ON invoice_analysis FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM invoices i JOIN organization_members om ON om.organization_id = i.organization_id WHERE i.id = invoice_analysis.invoice_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM invoices i JOIN organization_members om ON om.organization_id = i.organization_id WHERE i.id = invoice_analysis.invoice_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_ianalysis_if_org_member" ON invoice_analysis;
CREATE POLICY "delete_ianalysis_if_org_member" ON invoice_analysis FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM invoices i JOIN organization_members om ON om.organization_id = i.organization_id WHERE i.id = invoice_analysis.invoice_id AND om.user_id = auth.uid()));

-- PAYMENT_EVENTS
DROP POLICY IF EXISTS "select_pevent_if_org_member" ON payment_events;
CREATE POLICY "select_pevent_if_org_member" ON payment_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = payment_events.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_pevent_if_org_member" ON payment_events;
CREATE POLICY "insert_pevent_if_org_member" ON payment_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = payment_events.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_pevent_if_org_member" ON payment_events;
CREATE POLICY "update_pevent_if_org_member" ON payment_events FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = payment_events.organization_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = payment_events.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_pevent_if_org_member" ON payment_events;
CREATE POLICY "delete_pevent_if_org_member" ON payment_events FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = payment_events.organization_id AND om.user_id = auth.uid()));

-- PAYMENT_PROMISES
DROP POLICY IF EXISTS "select_promise_if_org_member" ON payment_promises;
CREATE POLICY "select_promise_if_org_member" ON payment_promises FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = payment_promises.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_promise_if_org_member" ON payment_promises;
CREATE POLICY "insert_promise_if_org_member" ON payment_promises FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = payment_promises.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_promise_if_org_member" ON payment_promises;
CREATE POLICY "update_promise_if_org_member" ON payment_promises FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = payment_promises.organization_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = payment_promises.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_promise_if_org_member" ON payment_promises;
CREATE POLICY "delete_promise_if_org_member" ON payment_promises FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = payment_promises.organization_id AND om.user_id = auth.uid()));

-- CLIENT_TONES
DROP POLICY IF EXISTS "select_ctone_if_org_member" ON client_tones;
CREATE POLICY "select_ctone_if_org_member" ON client_tones FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = client_tones.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_ctone_if_org_member" ON client_tones;
CREATE POLICY "insert_ctone_if_org_member" ON client_tones FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = client_tones.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_ctone_if_org_member" ON client_tones;
CREATE POLICY "update_ctone_if_org_member" ON client_tones FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = client_tones.organization_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = client_tones.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_ctone_if_org_member" ON client_tones;
CREATE POLICY "delete_ctone_if_org_member" ON client_tones FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = client_tones.organization_id AND om.user_id = auth.uid()));

-- EMAIL_DRAFTS
DROP POLICY IF EXISTS "select_draft_if_org_member" ON email_drafts;
CREATE POLICY "select_draft_if_org_member" ON email_drafts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = email_drafts.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_draft_if_org_member" ON email_drafts;
CREATE POLICY "insert_draft_if_org_member" ON email_drafts FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = email_drafts.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_draft_if_org_member" ON email_drafts;
CREATE POLICY "update_draft_if_org_member" ON email_drafts FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = email_drafts.organization_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = email_drafts.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_draft_if_org_member" ON email_drafts;
CREATE POLICY "delete_draft_if_org_member" ON email_drafts FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = email_drafts.organization_id AND om.user_id = auth.uid()));

-- ACTIVITY_EVENTS
DROP POLICY IF EXISTS "select_activity_if_org_member" ON activity_events;
CREATE POLICY "select_activity_if_org_member" ON activity_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = activity_events.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_activity_if_org_member" ON activity_events;
CREATE POLICY "insert_activity_if_org_member" ON activity_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = activity_events.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_activity_if_org_member" ON activity_events;
CREATE POLICY "update_activity_if_org_member" ON activity_events FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = activity_events.organization_id AND om.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = activity_events.organization_id AND om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_activity_if_org_member" ON activity_events;
CREATE POLICY "delete_activity_if_org_member" ON activity_events FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = activity_events.organization_id AND om.user_id = auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- STORAGE POLICIES
DROP POLICY IF EXISTS "upload_contract_if_org_member" ON storage.objects;
CREATE POLICY "upload_contract_if_org_member" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'contracts' AND EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid()));
DROP POLICY IF EXISTS "read_contract_if_org_member" ON storage.objects;
CREATE POLICY "read_contract_if_org_member" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'contracts' AND EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_contract_if_org_member" ON storage.objects;
CREATE POLICY "delete_contract_if_org_member" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'contracts' AND EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid()));

DROP POLICY IF EXISTS "upload_invoice_if_org_member" ON storage.objects;
CREATE POLICY "upload_invoice_if_org_member" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'invoices' AND EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid()));
DROP POLICY IF EXISTS "read_invoice_if_org_member" ON storage.objects;
CREATE POLICY "read_invoice_if_org_member" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'invoices' AND EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_invoice_if_org_member" ON storage.objects;
CREATE POLICY "delete_invoice_if_org_member" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'invoices' AND EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid()));
