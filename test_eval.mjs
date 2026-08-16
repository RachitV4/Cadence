import fs from 'fs';
import * as pdf_parse from 'pdf-parse';
const pdf = pdf_parse.default || pdf_parse;

const envStr = fs.readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(envStr.split('\n').map(line => line.split('=').map(p => p.trim().replace(/^"|"$/g, ''))));
const API_KEY = envVars.NVIDIA_NIM_API_KEY || envVars.NIM_API_KEY || process.env.NVIDIA_NIM_API_KEY;
const MODEL = envVars.NVIDIA_NIM_MODEL || 'meta/llama3-70b-instruct';

async function evaluate() {
  if (!API_KEY) {
    console.error('No NVIDIA_NIM_API_KEY found in .env');
    return;
  }
  
  console.log('Loading PDF...');
  const dataBuffer = fs.readFileSync('E:/Aurora_Digital_Services_Master_Services_Agreement_20MB_Test_Contract.pdf');
  
  console.log('Parsing PDF...');
  const data = await pdf(dataBuffer);
  
  // Truncate to first 4000 chars for the MVP evaluation
  const text = data.text.substring(0, 4000);
  console.log(`Extracted ${data.text.length} characters. Analyzing first 4000...`);
  
  const prompt = `You are a legal AI assistant. Analyze the following contract section and extract key terms and risk findings.
Return a JSON object with this exact structure:
{
  "terms": [
    { "term_name": "string", "extracted_value": "string" }
  ],
  "findings": [
    { "severity": "low|medium|high", "description": "string" }
  ]
}

Contract Text:
${text}`;

  console.log('Calling NVIDIA NIM API...');
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
    })
  });

  if (!response.ok) {
    console.error('API Error:', await response.text());
    return;
  }

  const result = await response.json();
  console.log('\n--- EVALUATION RESULTS ---\n');
  console.log(result.choices[0].message.content);
}

evaluate().catch(console.error);
