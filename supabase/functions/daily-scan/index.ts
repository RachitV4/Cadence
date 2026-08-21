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
    const { organizationId, slackWebhookUrl } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get overdue invoices
    const today = new Date().toISOString().split('T')[0];
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('organization_id', organizationId)
      .neq('payment_status', 'paid')
      .lt('due_date', today);

    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No overdue invoices found.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let draftsCreated = 0;

    // Fetch users for this organization to send platform notifications
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', organizationId);

    for (const inv of invoices) {
      // Check if a draft was already created today
      const { data: existingDraft } = await supabase
        .from('email_drafts')
        .select('id')
        .eq('invoice_id', inv.id)
        .gte('created_at', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (!existingDraft) {
        // Mocking the AI draft generation for the cron job to save time/API calls in this demo
        await supabase.from('email_drafts').insert({
          invoice_id: inv.id,
          organization_id: organizationId,
          client_id: inv.client_id,
          subject: `Action Required: Invoice ${inv.invoice_number} is Overdue`,
          body: `Hi ${inv.clients.name},\n\nOur automated system noticed that Invoice ${inv.invoice_number} for $${inv.amount.toLocaleString()} is currently past due (originally due on ${inv.due_date}).\n\nPlease let us know if there is an issue or when we can expect payment.\n\nBest,\nCadence Automated Accounts`,
          tone: 'strict',
          tone_reason: 'Automated 30-day escalation',
          status: 'draft',
        });
        
        if (users) {
          for (const u of users) {
            await supabase.from('notifications').insert({
              user_id: u.id,
              organization_id: organizationId,
              title: 'Overdue Invoice Detected',
              body: `Invoice ${inv.invoice_number} for ${inv.clients.name} is overdue.`,
              type: 'alert',
              link: `/dashboard/invoice/${inv.id}`
            });
          }
        }
        
        draftsCreated++;
      }
    }

    // Ping Slack with summary
    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🤖 *Autopilot Daily Scan Complete!*\nI found ${invoices.length} overdue invoices and automatically generated ${draftsCreated} new follow-up drafts for your approval in the dashboard.`
          })
        });
      } catch (e) {
        console.error('Slack failed', e);
      }
    }

    return new Response(JSON.stringify({ success: true, draftsCreated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
