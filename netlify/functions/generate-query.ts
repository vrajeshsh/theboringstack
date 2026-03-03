import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const openrouterApiKey = process.env.OPENROUTER_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const handler: Handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { query_text } = JSON.parse(event.body || '{}');
        if (!query_text || typeof query_text !== 'string') {
            return { statusCode: 400, body: JSON.stringify({ error: 'Query text is required' }) };
        }

        const prompt = `
      You are a senior growth marketing architect with expertise in Martech, CDP, CRM, Automation, Attribution, Paid media, Data architecture, Funnel engineering, and B2B & B2C growth.
      
      Analyze the following business description and growth goal:
      "${query_text}"
      
      Provide a highly professional strategic growth plan in clean Markdown format. 
      Include sections for:
      - Business Model Analysis
      - Recommended Tool Stack (as a list or table)
      - Core Automations
      - 90-Day Roadmap

      Keep it concise, actionable, and visual. No fluff.
    `;

        if (!openrouterApiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: "No API key provided. Please set OPENROUTER_API_KEY." }) };
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openrouterApiKey}`,
                "HTTP-Referer": "https://theboringstack.com",
                "X-Title": "TheBoringStack",
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-r1",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            return { statusCode: 500, body: JSON.stringify({ error: `OpenRouter API error: ${response.statusText}` }) };
        }

        const data = await response.json();
        let resultText = data.choices[0].message.content;

        // Remove deepseek thinking block
        const thinkMatch = resultText.match(/<think>[\s\S]*?<\/think>/);
        if (thinkMatch) {
            resultText = resultText.replace(thinkMatch[0], '');
        }

        const cleanedText = resultText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

        // Return the clean Markdown text
        return {
            statusCode: 200,
            body: JSON.stringify({
                id: Math.random().toString(36).substring(2, 15), // Mock ID for now to avoid supabase table issues during debug
                preview: cleanedText
            })
        };

    } catch (error: any) {
        console.error("Error generating query:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error?.message || "Failed to generate architecture" }) };
    }
};
