import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';


export const handler: Handler = async (event, context) => {
    const method = event.httpMethod;

    // Lazy init to prevent crash when env vars are missing at module load time
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        if (method === 'GET') {
            const { data, error } = await supabase
                .from('marketing_blueprints')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const parsedBlueprints = data.map((bp: any) => ({
                ...bp,
                input_data: typeof bp.input_data === 'string' ? JSON.parse(bp.input_data) : bp.input_data,
                ai_output: typeof bp.ai_output === 'string' ? JSON.parse(bp.ai_output) : bp.ai_output
            }));

            return { statusCode: 200, body: JSON.stringify(parsedBlueprints) };
        }

        if (method === 'POST') {
            const { id, business_name, input_data, ai_output } = JSON.parse(event.body || '{}');

            if (!id || !business_name || !input_data || !ai_output) {
                return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
            }

            const { error } = await supabase
                .from('marketing_blueprints')
                .insert([{
                    id,
                    business_name,
                    input_data: typeof input_data === 'string' ? input_data : JSON.stringify(input_data),
                    ai_output: typeof ai_output === 'string' ? ai_output : JSON.stringify(ai_output)
                }]);

            if (error) throw error;

            return { statusCode: 201, body: JSON.stringify({ success: true, id }) };
        }

        if (method === 'DELETE') {
            const id = event.queryStringParameters?.id;
            if (!id) {
                return { statusCode: 400, body: JSON.stringify({ error: 'ID is required' }) };
            }
            const { error } = await supabase.from('marketing_blueprints').delete().eq('id', id);
            if (error) throw error;

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error("Error with blueprints endpoint:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
