import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { clientEmail, providerToken, subjectQuery } = await req.json();

    if (!providerToken) {
      throw new Error('Google OAuth providerToken is required to access Gmail');
    }

    // Call actual Gmail API
    let query = `from:${clientEmail} OR to:${clientEmail}`;
    if (subjectQuery) {
      query += ` subject:(${subjectQuery})`;
    }
    
    const searchRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`, {
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    });

    if (!searchRes.ok) {
      throw new Error(`Gmail API error: ${await searchRes.text()}`);
    }

    const searchData = await searchRes.json();
    const messages = searchData.messages || [];

    const emails = [];
    for (const msg of messages) {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
        headers: {
          Authorization: `Bearer ${providerToken}`,
        },
      });
      const msgData = await msgRes.json();
      
      const subjectHeader = msgData.payload.headers.find((h: any) => h.name === 'Subject');
      const fromHeader = msgData.payload.headers.find((h: any) => h.name === 'From');
      const dateHeader = msgData.payload.headers.find((h: any) => h.name === 'Date');

      emails.push({
        id: msg.id,
        subject: subjectHeader ? subjectHeader.value : 'No Subject',
        snippet: msgData.snippet,
        from: fromHeader ? fromHeader.value : 'Unknown',
        date: dateHeader ? dateHeader.value : new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ emails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
