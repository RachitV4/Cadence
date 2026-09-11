import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TermResult {
  key: string;
  value: string;
  status: string;
  confidence: string;
  source_page?: number;
  source_section?: string;
  source_text?: string;
}

interface FindingResult {
  title: string;
  category: string;
  severity: string;
  description: string;
  source_page?: number;
  source_section?: string;
  source_text?: string;
  confidence?: string;
}

const TERM_KEYS = ['payment_terms', 'contract_value', 'late_fee', 'effective_date', 'expiration_date', 'termination', 'liability', 'ip', 'renewal', 'confidentiality', 'milestones'];

function parseJsonResponse(response: string): { terms: TermResult[]; findings: FindingResult[] } {
  const unfenced = response.replace(/```(?:json)?\s*/gi, '').trim();
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('NIM returned no JSON object');
  }

  const parsed = JSON.parse(unfenced.slice(start, end + 1));
  if (!Array.isArray(parsed.terms) || !Array.isArray(parsed.findings)) {
    throw new Error('NIM response does not match the contract extraction schema');
  }

  const terms = parsed.terms
    .filter((term: TermResult) => TERM_KEYS.includes(term.key))
    .map((term: TermResult) => ({
      ...term,
      value: typeof term.value === 'string' ? term.value.trim() : '',
      status: term.status === 'not_found' ? 'not_found' : 'found',
      confidence: ['high', 'medium', 'low'].includes(term.confidence) ? term.confidence : 'medium',
    }));

  if (!terms.some((term: TermResult) => term.status === 'found' && term.value)) {
    throw new Error('NIM did not extract any contract terms');
  }

  return { terms, findings: parsed.findings };
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

async function callNim(prompt: string, text: string, supabase: ReturnType<typeof createClient>): Promise<string> {
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
        { role: 'system', content: prompt },
        { role: 'user', content: text.slice(0, 28000) },
      ],
      temperature: 0.1,
      max_tokens: 4096,
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
    const { contractId, organizationId, text, pageCount } = await req.json();

    if (!contractId || !organizationId || !text) {
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

    const { data: analysisRun, error: analysisRunError } = await supabase.from('contract_analysis_runs').insert({
      contract_id: contractId,
      stage: 'ai_extraction',
      status: 'running',
      details: { text_length: text.length, page_count: pageCount },
    }).select('id').single();
    if (analysisRunError) throw analysisRunError;

    const startTime = Date.now();

    const systemPrompt = `You are a contract analysis AI for a freelance/agency invoicing tool called Cadence.
Analyze the following contract text and extract key terms and findings.

Return ONLY a valid JSON object with this exact structure:
{
  "terms": [
    { "key": "payment_terms", "value": "e.g. Net 30", "status": "found", "confidence": "high", "source_page": 1, "source_section": "Section name", "source_text": "exact quote from contract" },
    { "key": "contract_value", "value": "e.g. $50,000", "status": "found", "confidence": "high", "source_page": 1, "source_section": "", "source_text": "" },
    { "key": "late_fee", "value": "e.g. 1.5% per month", "status": "found", "confidence": "medium", "source_page": 2, "source_section": "", "source_text": "" },
    { "key": "effective_date", "value": "e.g. January 15, 2024", "status": "found", "confidence": "high", "source_page": 1, "source_section": "", "source_text": "" },
    { "key": "expiration_date", "value": "e.g. December 31, 2024", "status": "found", "confidence": "medium", "source_page": 1, "source_section": "", "source_text": "" },
    { "key": "termination", "value": "e.g. 30 days notice", "status": "found", "confidence": "high", "source_page": 3, "source_section": "", "source_text": "" },
    { "key": "liability", "value": "description of liability clause", "status": "found", "confidence": "medium", "source_page": 4, "source_section": "", "source_text": "" },
    { "key": "ip", "value": "description of IP ownership", "status": "found", "confidence": "medium", "source_page": 3, "source_section": "", "source_text": "" },
    { "key": "renewal", "value": "e.g. Auto-renews annually", "status": "found", "confidence": "medium", "source_page": 2, "source_section": "", "source_text": "" },
    { "key": "confidentiality", "value": "Confidentiality clause found", "status": "found", "confidence": "medium", "source_page": 4, "source_section": "", "source_text": "" },
    { "key": "milestones", "value": "e.g. Milestone-based payments found", "status": "found", "confidence": "medium", "source_page": 2, "source_section": "", "source_text": "" }
  ],
  "findings": [
    { "title": "Finding title", "category": "payment|termination|liability|scope|other", "severity": "low|medium|high", "description": "Why this matters", "source_page": 1, "source_section": "", "source_text": "exact quote", "confidence": "high|medium|low" }
  ]
}

Rules:
- For terms not found in the contract, use status "not_found", value "", confidence "low".
- source_page should be the page number where the term was found (estimate if unsure, based on document order).
- source_text should be a short exact quote from the contract supporting the extracted value.
- Include 2-6 findings that highlight important clauses, risks, or unusual terms.
- Return ONLY the JSON, no markdown, no explanation.`;

    let terms: TermResult[] = [];
    let findings: FindingResult[] = [];

    try {
      const aiResponse = await callNim(systemPrompt, text, supabase);
      ({ terms, findings } = parseJsonResponse(aiResponse));
    } catch (aiErr) {
      const message = aiErr instanceof Error ? aiErr.message : 'Contract extraction failed';
      console.error('AI contract extraction failed:', message);
      await supabase.from('contract_analysis_runs').update({
        status: 'failed',
        duration_ms: Date.now() - startTime,
        error_message: message,
      }).eq('id', analysisRun.id);
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const duration = Date.now() - startTime;

    await supabase.from('contract_analysis_runs').update({
      status: 'complete',
      duration_ms: duration,
      details: { terms_found: terms.filter(t => t.status === 'found').length, findings_count: findings.length },
    }).eq('id', analysisRun.id);

    return new Response(JSON.stringify({ terms, findings }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
