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

const TONE_ANCHORS = [
  { level: 0, key: 'humble', label: 'Humble' },
  { level: 25, key: 'casual_friendly', label: 'Casual / Friendly' },
  { level: 40, key: 'modest', label: 'Modest' },
  { level: 50, key: 'formal', label: 'Formal' },
  { level: 75, key: 'strict', label: 'Strict' },
  { level: 100, key: 'strict', label: 'Strict & Formal' },
];

function getToneAnchor(value: unknown) {
  const level = Math.min(100, Math.max(0, Math.round(Number(value)) || 25));
  return TONE_ANCHORS.reduce((nearest, anchor) =>
    Math.abs(anchor.level - level) < Math.abs(nearest.level - level) ? anchor : nearest,
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { invoiceId, organizationId, toneLevel, clientName, invoiceNumber, amount, dueDate, advice, explanation, contractTerms, clientNotes, isRepeat, existingDraft } = body;

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

    const toneAnchor = getToneAnchor(toneLevel);
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

    const toneDesc = TONE_DESCRIPTIONS[toneAnchor.key];
    const originalEmail = typeof existingDraft?.body === 'string' ? existingDraft.body.trim() : '';
    const originalSubject = typeof existingDraft?.subject === 'string' ? existingDraft.subject.trim() : '';
    const requiredFacts = [
      invoiceNumber ? String(invoiceNumber) : '',
      `$${formattedAmount.toLocaleString()}`,
      dueDate ? formattedDueDate : '',
      termsMap.payment_terms && originalEmail.includes(termsMap.payment_terms) ? termsMap.payment_terms : '',
      termsMap.late_fee && originalEmail.includes(termsMap.late_fee) ? termsMap.late_fee : '',
    ].filter(Boolean);

    const prompt = `Write a payment follow-up email with the following context:

RECIPIENT: ${firstName}
INVOICE: ${invoiceNumber || 'this invoice'}
AMOUNT: $${formattedAmount.toLocaleString()}
DUE DATE: ${formattedDueDate}
REPEAT CLIENT: ${isRepeat ? 'Yes' : 'No'}
CLIENT NOTES: ${clientNotes || 'None'}

CONTRACT TERMS:
- Payment terms: ${termsMap.payment_terms || 'Not specified'}
- Late fee: ${termsMap.late_fee || 'Not specified'}

ADVICE CONTEXT: ${advice || ''}
REASONING: ${explanation || ''}

TONE LEVEL: ${toneLevel} / 100
TONE: ${toneAnchor.label} — ${toneDesc}

SIGNATURE: ${orgName}

Return ONLY a valid JSON object:
{
  "subject": "Email subject line",
  "body": "Full email body as plain text with line breaks. Start with the greeting, end with the signature. Do not include the subject in the body."
}

Rules:
- Preserve every factual identifier, amount, date, payment term, late fee, promise, and commercial request already present in the original email.
- The greeting should match the tone (e.g. "Hi John," for casual, "Dear John," for formal)
- Reference the specific contract terms (payment terms, late fees) when relevant
- Keep it concise — 3-5 short paragraphs maximum
- Do not include any markdown formatting
- Return ONLY the JSON, no other text
${originalEmail ? `
Rewrite this existing email instead of creating a new one:
SUBJECT: ${originalSubject}
BODY:
${originalEmail}` : ''}`;

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
      if (originalEmail) {
        subject = originalSubject || subject;
        emailBody = originalEmail;
      } else if (isRepeat) {
        emailBody = `Hi ${firstName},\n\nHope you're doing well! Just a quick note about Invoice ${invoiceNumber} for $${formattedAmount.toLocaleString()}, which was due on ${formattedDueDate}.\n\nI know things get busy on your end — no worries at all. Just wanted to send a friendly reminder. ${termsMap.payment_terms ? `Per our agreement, payment terms are ${termsMap.payment_terms}.` : ''} ${termsMap.late_fee ? `As a heads-up, late fees of ${termsMap.late_fee} may apply per our contract.` : ''}\n\nLet me know if you need anything from my end to get this processed.\n\nBest,\n${orgName}`;
      } else {
        emailBody = `Dear ${firstName},\n\nI am writing to follow up regarding Invoice ${invoiceNumber} in the amount of $${formattedAmount.toLocaleString()}, which was due on ${formattedDueDate}.\n\n${termsMap.payment_terms ? `As per our agreement, the payment terms are ${termsMap.payment_terms}. ` : ''}${termsMap.late_fee ? `Please note that late fees of ${termsMap.late_fee} may apply in accordance with the contract terms.` : ''}\n\nI would appreciate an update on the status of this payment.\n\nSincerely,\n${orgName}`;
      }
    }

    const generatedText = `${subject}\n${emailBody}`.toLowerCase();
    const preservationWarnings = requiredFacts
      .filter((fact) => !generatedText.includes(fact.toLowerCase()))
      .map((fact) => `Please verify that “${fact}” was preserved.`);

    return new Response(JSON.stringify({
      subject,
      body: emailBody,
      tone: toneAnchor.key,
      tone_level: toneAnchor.level,
      tone_label: toneAnchor.label,
      preservation_warnings: preservationWarnings,
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
