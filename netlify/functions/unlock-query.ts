import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';


export const handler: Handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Lazy init to prevent crash when env vars are missing at module load time
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        const { id, name, email } = JSON.parse(event.body || '{}');
        if (!id || !name || !email) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        // Check or create subscriber
        let { data: subscriber, error: subError } = await supabase
            .from('subscribers')
            .select('*')
            .eq('email', email)
            .single();

        if (!subscriber && subError?.code === 'PGRST116') { // not found
            const { data: newSub, error: insertError } = await supabase
                .from('subscribers')
                .insert([{ email, name, total_queries: 0 }])
                .select()
                .single();

            if (insertError) {
                console.error("Error creating subscriber:", insertError);
                return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
            }
            subscriber = newSub;
        } else if (subError) {
            console.error("Error fetching subscriber:", subError);
            return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
        }

        if (subscriber.total_queries >= 3) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: "Limit reached",
                    message: "Need deeper help? Let's build it together.",
                    limitReached: true
                })
            };
        }

        // Update query with email
        const { error: updateQueryError } = await supabase
            .from('marketing_queries')
            .update({ email })
            .eq('id', id);

        if (updateQueryError) {
            console.error("Error updating query:", updateQueryError);
            return { statusCode: 500, body: JSON.stringify({ error: 'Failed to unlock architecture' }) };
        }

        // Increment queries
        const { error: incError } = await supabase
            .from('subscribers')
            .update({ total_queries: subscriber.total_queries + 1 })
            .eq('email', email);

        if (incError) {
            console.error("Error updating subscriber queries:", incError);
        }

        // Get full output
        const { data: queryRow, error: fetchError } = await supabase
            .from('marketing_queries')
            .select('ai_output')
            .eq('id', id)
            .single();

        if (fetchError || !queryRow) {
            console.error("Error fetching query:", fetchError);
            return { statusCode: 404, body: JSON.stringify({ error: 'Query not found' }) };
        }

        const fullBlueprint = JSON.parse(queryRow.ai_output);
        return { statusCode: 200, body: JSON.stringify({ blueprint: fullBlueprint }) };

    } catch (error) {
        console.error("Error unlocking query:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to unlock architecture" }) };
    }
};
