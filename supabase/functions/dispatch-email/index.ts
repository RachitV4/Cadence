import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { draftId } = await req.json();

    if (!draftId) {
      throw new Error('draftId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: draft, error: fetchError } = await supabase
      .from('email_drafts')
      .select('subject, body, client_id, status')
      .eq('id', draftId)
      .single();

    if (fetchError || !draft) {
      throw new Error('Draft not found');
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Cadence <onboarding@resend.dev>',
          to: ['delivered@resend.dev'],
          subject: draft.subject,
          text: draft.body
        })
      });
      
      if (!res.ok) {
        const err = await res.text();
        console.error('Failed to send email:', err);
        throw new Error('Failed to send email via Resend');
      }
      console.log('Email sent via Resend');
    } else {
      console.log('Simulating email dispatch for draft:', draftId);
    }

    const { error: updateError } = await supabase
      .from('email_drafts')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', draftId);

    if (updateError) {
      throw new Error('Failed to update draft status');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
