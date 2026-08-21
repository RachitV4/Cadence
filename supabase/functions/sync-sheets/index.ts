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
    const { providerToken, organizationId } = await req.json();

    if (!providerToken) {
      throw new Error('Google OAuth providerToken is required to access Sheets');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invoices and clients
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*, clients(name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 1. Create a new Spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `Cadence Cash Flow Sync - ${new Date().toLocaleDateString()}`
        }
      })
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create spreadsheet: ${await createRes.text()}`);
    }

    const sheetData = await createRes.json();
    const spreadsheetId = sheetData.spreadsheetId;

    // 2. Prepare data to insert
    const values = [
      ['Invoice #', 'Client', 'Amount', 'Issue Date', 'Due Date', 'Status']
    ];

    for (const inv of (invoices || [])) {
      values.push([
        inv.invoice_number || 'N/A',
        inv.clients?.name || 'Unknown',
        `$${inv.amount.toLocaleString()}`,
        inv.issue_date || '',
        inv.due_date || '',
        inv.payment_status || 'pending'
      ]);
    }

    // 3. Write data to the sheet
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:F${values.length}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values
      })
    });

    if (!updateRes.ok) {
      throw new Error(`Failed to update spreadsheet: ${await updateRes.text()}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      spreadsheetUrl: sheetData.spreadsheetUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
