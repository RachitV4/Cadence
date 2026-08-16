import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EvidenceItem {
  source: string;
  detail: string;
  reference?: string;
}

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
        { role: 'system', content: 'You are a payment follow-up advisor AI for Cadence, a contract-aware invoicing tool. You analyze contract terms, client history, and invoice status to recommend the best follow-up action.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NIM API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { invoiceId, organizationId, contractTerms, clientContext, invoiceData, paymentHistory, invoiceCount } = body;

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

    const termsMap: Record<string, string> = {};
    (contractTerms || []).forEach((t: { key: string; value: string }) => { termsMap[t.key] = t.value; });

    const isRepeat = clientContext?.is_repeat || false;
    const clientNotes = clientContext?.notes || '';
    const amount = invoiceData?.amount || 0;
    const dueDate = invoiceData?.due_date;
    const invoiceNumber = invoiceData?.invoice_number || 'this invoice';
    const pastPayments = paymentHistory || [];

    let invoiceAge = 0;
    let dueStatus = 'upcoming';
    if (dueDate) {
      const due = new Date(dueDate);
      const now = new Date();
      const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      invoiceAge = diff;
      if (diff === 0) dueStatus = 'due_today';
      else if (diff > 0) dueStatus = 'overdue';
    }

    const onTimePayments = pastPayments.filter((p: { days_late: number }) => p.days_late === 0).length;
    const latePayments = pastPayments.filter((p: { days_late: number }) => p.days_late > 0).length;

    const prompt = `Analyze this invoice situation and provide payment follow-up advice.

INVOICE DETAILS:
- Invoice number: ${invoiceNumber}
- Amount: $${amount.toLocaleString()}
- Due date: ${dueDate || 'Not specified'}
- Days overdue: ${invoiceAge} (${dueStatus})

CONTRACT TERMS:
- Payment terms: ${termsMap.payment_terms || 'Not specified'}
- Late fee: ${termsMap.late_fee || 'Not specified'}
- Termination: ${termsMap.termination || 'Not specified'}

CLIENT CONTEXT:
- Repeat client: ${isRepeat ? 'Yes' : 'No'}
- Client notes: ${clientNotes || 'None'}
- Total invoices for this client: ${invoiceCount || 1}
- Payment history: ${onTimePayments} on-time, ${latePayments} late out of ${pastPayments.length} total payments

Return ONLY a valid JSON object with this exact structure:
{
  "risk_level": "low|medium|high",
  "recommendation": "Short recommendation title",
  "recommended_action": "One of: No action, Friendly nudge, Firm reminder, Follow up, Escalate internally",
  "recommended_tone": "One of: humble, casual_friendly, formal, strict, modest",
  "explanation": "2-4 sentences explaining the reasoning, referencing specific contract terms and history",
  "evidence": [
    { "source": "Contract|Payment history|Client context|Invoice", "detail": "Specific fact", "reference": "Where this came from" }
  ],
  "tone_reason": "1-2 sentences explaining why this tone was recommended"
}

Be specific and reference actual contract terms and payment history in your explanation. Return ONLY the JSON.`;

    let result = {
      risk_level: 'low' as string,
      recommendation: '',
      recommended_action: '',
      recommended_tone: 'casual_friendly',
      explanation: '',
      evidence: [] as EvidenceItem[],
      tone_reason: '',
    };

    try {
      const aiResponse = await callNim(prompt, supabase);
      const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      result = {
        risk_level: parsed.risk_level || 'low',
        recommendation: parsed.recommendation || '',
        recommended_action: parsed.recommended_action || '',
        recommended_tone: parsed.recommended_tone || 'casual_friendly',
        explanation: parsed.explanation || '',
        evidence: parsed.evidence || [],
        tone_reason: parsed.tone_reason || '',
      };
    } catch (aiErr) {
      console.error('AI advice generation failed, using fallback:', aiErr.message);
      // Fallback logic
      let riskLevel = 'low';
      if (dueStatus === 'overdue' && invoiceAge > 30) riskLevel = 'high';
      else if (dueStatus === 'overdue' && invoiceAge > 14) riskLevel = 'medium';
      else if (dueStatus === 'overdue') riskLevel = 'medium';

      if (dueStatus === 'upcoming') {
        result = {
          risk_level: 'low',
          recommendation: 'No action needed',
          recommended_action: 'No action',
          recommended_tone: 'humble',
          explanation: `Invoice ${invoiceNumber} is not yet due. No action is needed at this time.`,
          evidence: [],
          tone_reason: 'No action is needed, so no tone is recommended.',
        };
      } else {
        result = {
          risk_level: riskLevel,
          recommendation: 'Friendly nudge',
          recommended_action: 'Friendly nudge',
          recommended_tone: 'casual_friendly',
          explanation: `Invoice ${invoiceNumber} for $${amount.toLocaleString()} is ${invoiceAge > 0 ? `${invoiceAge} days overdue` : 'due today'}. ${termsMap.payment_terms ? `Payment terms are ${termsMap.payment_terms}.` : ''} A friendly follow-up is recommended.`,
          evidence: termsMap.payment_terms ? [{ source: 'Contract', detail: `Payment terms: ${termsMap.payment_terms}`, reference: 'Contract terms' }] : [],
          tone_reason: isRepeat ? 'Repeat client — a warm, conversational check-in is appropriate.' : 'A friendly check-in is appropriate for this situation.',
        };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
