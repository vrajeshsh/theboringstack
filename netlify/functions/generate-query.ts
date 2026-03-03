import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const handler: Handler = async (event, context) => {
    const openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
    const siteUrl = process.env.URL || 'https://theboringstack.netlify.app';

    // Lazy init to prevent crash when env vars are missing at module load time
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Request body is empty' }) };
        }

        const { query_text } = JSON.parse(event.body);
        if (!query_text || typeof query_text !== 'string') {
            return { statusCode: 400, body: JSON.stringify({ error: 'Query text is required' }) };
        }

        if (!openrouterApiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: "Netlify Error: OPENROUTER_API_KEY is not set in environment variables." }) };
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

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openrouterApiKey}`,
                "HTTP-Referer": siteUrl,
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
            const errorData = await response.json().catch(() => ({}));
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: `OpenRouter API error (${response.status}): ${errorData.error?.message || response.statusText || 'Unknown Error'}`
                })
            };
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0]) {
            return { statusCode: 500, body: JSON.stringify({ error: "OpenRouter returned an empty response." }) };
        }

        let resultText = data.choices[0].message.content;

        // Remove deepseek thinking block
        const thinkMatch = resultText.match(/<think>[\s\S]*?<\/think>/);
        if (thinkMatch) {
            resultText = resultText.replace(thinkMatch[0], '');
        }

        const cleanedText = resultText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

        const id = Math.random().toString(36).substring(2, 15);

        // Save to Supabase
        const { error: insertError } = await supabase
            .from('marketing_queries')
            .insert([{
                id,
                query_text,
                ai_output: cleanedText,
                lead_score: 0
            }]);

        if (insertError) {
            console.error("Error saving query to Supabase:", insertError);
            return { statusCode: 500, body: JSON.stringify({ error: 'Database error while saving query' }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                id,
                preview: cleanedText
            })
        };

    } catch (error: any) {
        console.error("Error generating query:", error);
        return { statusCode: 500, body: JSON.stringify({ error: `Function Crash: ${error?.message || "Internal error"}` }) };
    }
};
