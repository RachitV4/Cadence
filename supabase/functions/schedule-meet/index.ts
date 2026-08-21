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
    const { clientEmail, clientName, providerToken } = await req.json();

    if (!providerToken) {
      throw new Error('Google OAuth providerToken is required to access Calendar');
    }

    // Schedule a 15 min meeting for tomorrow at 2 PM (local to UTC representation roughly)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // 2:00 PM
    
    const endTime = new Date(tomorrow.getTime() + 15 * 60000); // 2:15 PM

    const event = {
      summary: `Payment Sync: Cadence & ${clientName}`,
      description: 'Quick sync regarding pending invoices.',
      start: {
        dateTime: tomorrow.toISOString(),
        timeZone: 'UTC', // Using UTC for simplicity, in real app pass user timezone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: [
        { email: clientEmail }
      ],
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Calendar API error: ${errText}`);
    }

    const data = await res.json();

    return new Response(JSON.stringify({ 
      success: true, 
      meetLink: data.hangoutLink,
      eventTime: tomorrow.toISOString()
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
