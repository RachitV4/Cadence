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
      return new Response(JSON.stringify({ error: 'Google OAuth token is required to check Gmail.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query only this client's thread candidates; message bodies are not persisted here.
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

    // Metadata format keeps polling lightweight while still providing enough context
    // for the inbox and reply-aware drafting flow.
    const emails = [];
    for (const msg of messages) {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=Message-ID`, {
        headers: {
          Authorization: `Bearer ${providerToken}`,
        },
      });
      const msgData = await msgRes.json();
      
      const headers = (msgData.payload?.headers || []) as Array<{ name: string; value: string }>;
      const subjectHeader = headers.find((header) => header.name === 'Subject');
      const fromHeader = headers.find((header) => header.name === 'From');
      const dateHeader = headers.find((header) => header.name === 'Date');
      const messageIdHeader = headers.find((header) => header.name === 'Message-ID' || header.name === 'Message-Id');

      emails.push({
        id: msg.id,
        threadId: msgData.threadId,
        messageId: messageIdHeader ? messageIdHeader.value : undefined,
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
