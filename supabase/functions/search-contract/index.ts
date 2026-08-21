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
        { role: 'user', content: text },
      ],
      temperature: 0.1,
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { contractId, query } = await req.json();

    if (!contractId || !query) {
      return new Response(JSON.stringify({ error: 'Missing contractId or query' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch text from contract_pages
    const { data: pages, error } = await supabase
      .from('contract_pages')
      .select('text_content')
      .eq('contract_id', contractId)
      .order('page_number', { ascending: true });

    if (error || !pages) {
      throw new Error('Failed to fetch contract text');
    }

    const fullText = pages.map(p => p.text_content).join('\n\n').slice(0, 28000);

    const systemPrompt = `You are a legal assistant. Answer the user's question precisely based ONLY on the contract text provided.
If the answer is not in the text, say "I could not find the answer in the provided contract."
DO NOT include any citations, references, quotes, or page numbers in your answer.
Be concise and clear.`;

    const aiResponse = await callNim(systemPrompt, `Contract Text:\n${fullText}\n\nQuestion: ${query}`, supabase);

    return new Response(JSON.stringify({ answer: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
