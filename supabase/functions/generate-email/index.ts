import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function getNimConfig(supabase: ReturnType<typeof createClient>): Promise<{ apiKey: string; apiUrl: string; model: string }> {
  let apiKey = Deno.env.get('NVIDIA_NIM_API_KEY') || Deno.env.get('NIM_API_KEY');
  let apiUrl = Deno.env.get('NVIDIA_NIM_API_URL') || Deno.env.get('NIM_API_URL');
  let model = Deno.env.get('NVIDIA_NIM_MODEL') || Deno.env.get('NIM_MODEL');

  if (!apiKey) {
    const { data } = await supabase.rpc('get_nim_secrets');
    if (data) {
      apiKey = apiKey || data.nim_api_key;
      apiUrl = apiUrl || data.nim_api_url;
      model = model || data.nim_model;
    }
  }

  if (!apiKey) throw new Error('NVIDIA_NIM_API_KEY not configured');
  return { 
    apiKey, 
    apiUrl: apiUrl || 'https://integrate.api.nvidia.com/v1/chat/completions', 
    model: model || 'meta/llama3-70b-instruct' 
  };
}

async function callNim(prompt: string, supabase: ReturnType<typeof createClient>): Promise<string> {
  const { apiKey, apiUrl, model } = await getNimConfig(supabase);

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a professional email drafting AI for Cadence, a contract-aware invoicing tool. You write payment follow-up emails that are context-aware and tailored to the specified tone.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NIM API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

const TONE_DESCRIPTIONS: Record<string, string> = {
  humble: 'apologetic, gentle, soft-spoken — treats the delay as possibly your fault, very polite',
  casual_friendly: 'warm, conversational, relaxed — like talking to a friend, uses first names',
  formal: 'professional, businesslike, respectful — uses proper titles and formal language',
  strict: 'firm, direct, authoritative — emphasizes the contractual obligation and consequences',
  modest: 'simple, understated, matter-of-fact — brief and to the point without emotion',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { invoiceId, organizationId, clientId, tone, clientName, amount, dueDate, invoiceNumber, advice, explanation, contractTerms, clientNotes, isRepeat, emailThread } = await req.json();

    if (!invoiceId || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const toneKey = tone || 'casual_friendly';
    const firstName = clientName?.split(/\s|,/)[0] || 'there';
    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'the due date';
    const formattedAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;

    const termsMap: Record<string, string> = {};
    (contractTerms || []).forEach((t: { key: string; value: string }) => { termsMap[t.key] = t.value; });

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .maybeSingle();
    const orgName = org?.name || 'our team';

    const toneDesc = TONE_DESCRIPTIONS[toneKey] || TONE_DESCRIPTIONS.casual_friendly;

    const prompt = `You are Cadence, an AI accounts receivable expert acting as a ghostwriter.
Your goal is to draft a highly effective email to a client regarding an invoice.

You will be provided with:
- Client Name: ${firstName}
- Client Profile: ${isRepeat ? 'Repeat client' : 'New client'}. Notes: ${clientNotes || 'None'}
- Invoice Details: #${invoiceNumber}, Amount: $${formattedAmount.toLocaleString()}, Due: ${formattedDueDate}
- Contract Terms: ${JSON.stringify(contractTerms)}
- Cadence Analysis & Strategy: ${advice || 'None'}
- Detailed Reasoning: ${explanation || 'None'}
- Target Tone: ${toneKey} - ${toneDesc}
${emailThread && emailThread.length > 0 ? `- RECENT EMAIL CONTEXT (The client replied recently. YOU MUST RESPOND DIRECTLY TO THEIR LATEST POINTS): \n${emailThread.map((e: any) => `[From ${e.from}]: ${e.snippet}`).join('\n')}` : ''}
- CONTRACT TERMS (Hierarchical Knowledge Graph):
${Object.entries(termsMap).map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`).join('\n') || 'None provided'}
*(Note: If multiple overlapping terms exist, consider the most recently signed SOW to override the MSA budget/timeline, but overarching legal clauses like Late Fees usually come from the MSA).*

CRITICAL RULES & GUARDRAILS:
1. ONLY return a JSON object with "subject" and "body" keys.
2. The "body" should be the raw email text. Do not include signature blocks (like [Your Name]). 
3. Embrace the target tone completely. If the tone is 'strict', be firm. If 'casual_friendly', be warm. If 'humble' or 'empathetic', be highly apologetic.
4. YOU MUST FOLLOW THE CADENCE ADVICE AND REASONING. If the reasoning says "we overbilled the client" or "we demanded payment too early based on the contract", your email MUST APOLOGIZE and offer to correct the invoice immediately. Do NOT ask them for money if we made a mistake!
5. ${emailThread && emailThread.length > 0 ? 'SINCE THERE IS AN EMAIL THREAD, this is a REPLY. Do NOT write a first-contact email. Acknowledge what they said in the thread and counter it based on your analysis.' : 'Do NOT hallucinate contract terms that are not provided.'}

- The greeting should match the tone (e.g. "Hi John," for casual, "Dear John," for formal)
- Reference the specific contract terms (payment terms, late fees) when relevant
- Keep it concise — 3-5 short paragraphs maximum
- Do not include any markdown formatting
- Return ONLY the JSON, no other text`;

    let subject = `Reminder: Invoice ${invoiceNumber || ''} — ${orgName}`;
    let emailBody = '';

    try {
      const aiResponse = await callNim(prompt, supabase);
      const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      subject = parsed.subject || subject;
      emailBody = parsed.body || '';
    } catch (aiErr) {
      console.error('AI email generation failed, using fallback:', aiErr.message);
      // Fallback template
      if (isRepeat) {
        emailBody = `Hi ${firstName},\n\nHope you're doing well! Just a quick note about Invoice ${invoiceNumber} for $${formattedAmount.toLocaleString()}, which was due on ${formattedDueDate}.\n\nI know things get busy on your end — no worries at all. Just wanted to send a friendly reminder. ${termsMap.payment_terms ? `Per our agreement, payment terms are ${termsMap.payment_terms}.` : ''} ${termsMap.late_fee ? `As a heads-up, late fees of ${termsMap.late_fee} may apply per our contract.` : ''}\n\nLet me know if you need anything from my end to get this processed.\n\nBest,\n${orgName}`;
      } else {
        emailBody = `Dear ${firstName},\n\nI am writing to follow up regarding Invoice ${invoiceNumber} in the amount of $${formattedAmount.toLocaleString()}, which was due on ${formattedDueDate}.\n\n${termsMap.payment_terms ? `As per our agreement, the payment terms are ${termsMap.payment_terms}. ` : ''}${termsMap.late_fee ? `Please note that late fees of ${termsMap.late_fee} may apply in accordance with the contract terms.` : ''}\n\nI would appreciate an update on the status of this payment.\n\nSincerely,\n${orgName}`;
      }
    }

    return new Response(JSON.stringify({
      subject,
      body: emailBody,
      tone: toneKey,
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
