import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { clientId, organizationId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Client info
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).maybeSingle();

    // Fetch overdue invoices for this client
    const today = new Date().toISOString().split('T')[0];
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, invoice_analysis(*)')
      .eq('client_id', clientId)
      .neq('payment_status', 'paid')
      .lt('due_date', today);

    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({ error: 'No overdue invoices found for this client.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const totalOwed = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const invoiceListText = invoices.map(i => `Invoice ${i.invoice_number} - $${i.amount.toLocaleString()} (Due: ${i.due_date})`).join('\n');

    // Generate a master draft via OpenAI (mocking direct API call logic here to save time for the hackathon, or we can use the same Nim endpoint)
    // For the sake of the hackathon demo, we will generate a high-quality static template dynamically filled with their data.
    const masterDraft = `Hi ${client.name},\n\nI'm reaching out regarding your account balance. We currently have ${invoices.length} outstanding invoices past their due dates, totaling $${totalOwed.toLocaleString()}.\n\nHere is the breakdown:\n${invoiceListText}\n\nCould we jump on a quick 15-minute call tomorrow to discuss consolidating these and getting the account up to date?\n\nBest,\nCadence Automated Accounts`;

    // Save as a special email draft attached to the client (we can just attach it to the oldest invoice, or create a generic client-level draft if schema allows)
    // Our schema requires invoice_id for email_drafts. We will attach it to the oldest invoice.
    const oldestInvoice = invoices.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

    await supabase.from('email_drafts').insert({
      invoice_id: oldestInvoice.id,
      organization_id: organizationId,
      client_id: clientId,
      subject: `Action Required: Consolidated Account Balance for ${client.name}`,
      body: masterDraft,
      tone: 'strict',
      tone_reason: 'Batch consolidated negotiation for multiple overdue invoices.',
      status: 'draft',
    });

    return new Response(JSON.stringify({ success: true, totalOwed, invoicesCount: invoices.length, draftAttachedTo: oldestInvoice.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
