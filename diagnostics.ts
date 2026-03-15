import 'dotenv/config';

async function runDiagnostics() {
  console.log("🔍 STARTING BACKEND DIAGNOSTICS...");
  
  // 1. Env Var Check
  const keys = ['OPENROUTER_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY'];
  keys.forEach(key => {
    if (process.env[key]) {
      console.log(`✅ ${key} is set (Length: ${process.env[key].length})`);
    } else {
      console.error(`❌ ${key} is MISSING`);
    }
  });

  // 2. OpenRouter Connectivity Check
  console.log("\n📡 Testing OpenRouter Connectivity...");
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // Use a fast model for testing
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5
      })
    });
    
    if (response.ok) {
      console.log("✅ OpenRouter API is reachable and key is valid.");
    } else {
      const text = await response.text();
      console.error(`❌ OpenRouter API Error (${response.status}):`, text);
    }
  } catch (err: any) {
    console.error("❌ OpenRouter Fetch Failed:", err.message);
  }

  // 3. Supabase Check
  console.log("\n🗄️ Testing Supabase Connectivity...");
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
    const { data, error } = await supabase.from('marketing_queries').select('id').limit(1);
    if (error) throw error;
    console.log("✅ Supabase connection successful.");
  } catch (err: any) {
    console.error("❌ Supabase connection failed:", err.message);
  }
}

runDiagnostics();
