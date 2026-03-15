import "dotenv/config";
import express from "express";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from 'resend';
import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// State for database connections
let db: any = null;
let supabase: any = null;

/**
 * Safely initializes the database connection on demand.
 * This prevents Vercel cold-start crashes caused by native SQLite dependencies.
 */
async function getDb() {
  if (supabase || db) return { supabase, db };

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log("✅ Lazy-initialized Supabase");
      return { supabase, db: null };
    } catch (err) {
      console.error("❌ Failed to initialize Supabase:", err);
    }
  }

  // If we are on Vercel and missing these, we MUST error out cleanly
  if (process.env.VERCEL) {
    console.error("❌ CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on Vercel.");
    return { supabase: null, db: null };
  }
  
  console.log("⚠️ Supabase credentials not found. Using local SQLite.");
  try {
    // Dynamic import to prevent Vercel from failing if the native module isn't present
    const { default: Database } = await import("better-sqlite3");
    db = new Database(path.join(__dirname, "blueprints.db"));
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS marketing_blueprints (id TEXT PRIMARY KEY, business_name TEXT, input_data TEXT, ai_output TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, name TEXT, total_queries INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS marketing_queries (id TEXT PRIMARY KEY, email TEXT, query_text TEXT, ai_output TEXT, lead_score INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    `);
    console.log("✅ Local SQLite initialized.");
  } catch (err: any) {
    console.error("❌ Failed to initialize SQLite:", err.message);
    db = null;
  }
  
  return { supabase, db };
}

const app = express();
app.use(express.json({ limit: "50mb" }));

/**
 * Defensive JSON Fetch Wrapper
 */
async function safeFetchJson(url: string, options: any) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type");
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Upstream Error (${response.status}):`, errorText);
    throw new Error(`Upstream API error: ${errorText.substring(0, 100)}`);
  }

  if (contentType && contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (err) {
      const rawText = await response.text();
      console.error("JSON Parse Error. Raw body:", rawText);
      throw new Error("Upstream API returned invalid JSON");
    }
  } else {
    const rawText = await response.text();
    console.error("Expected JSON but got:", contentType, "Body:", rawText);
    throw new Error("Upstream API did not return JSON");
  }
}

// Sanity-check for Vercel environment variables on startup
if (process.env.VERCEL) {
  console.log("🔍 Checking Vercel Environment Variables...");
  const requiredKeys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENROUTER_API_KEY', 'RESEND_API_KEY'];
  requiredKeys.forEach(key => {
    if (process.env[key] && process.env[key]!.length > 0) {
      console.log(`✅ ${key} is set.`);
    } else {
      console.error(`❌ CRITICAL: ${key} is MISSING or empty.`);
    }
  });
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

  // Generate Blueprint from simple query
  app.post("/api/generate-query", async (req, res) => {
    try {
      const { query_text } = req.body;
      if (!query_text || typeof query_text !== 'string') {
        return res.status(400).json({ error: "Query text is required" });
      }

      const prompt = `
        You are the **Lead Growth Marketing Architect** at **TheBoringStack**. Your goal is to design a high-performance, scalable marketing infrastructure for a client. 

        Client Context/Goal:
        "${query_text}"

        ### Instructions for the Overview (Preview):
        1. **Prosperous Business Overview**: Briefly describe how the user's business could prosper and scale using the right technology stack.
        2. **Growth Potential**: Highlight 2-3 key areas where AI and modern MarTech will provide the biggest ROI.
        3. **Guided Next Steps**: Encourage the user to sign up to receive the **Full Growth Architecture Blueprint** (PDF) including specific tool recommendations, automations, and a 90-day roadmap.

        Keep it concise, inspirational, and professional. Return in clean Markdown.
      `;

      let resultText = "";

      if (process.env.OPENROUTER_API_KEY) {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://theboringstack.com",
            "X-Title": "TheBoringStack",
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-chat", 
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 1500
          })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        resultText = data.choices[0].message.content;
      } else {
        throw new Error("No API key provided. Please set OPENROUTER_API_KEY in .env file.");
      }

      // Remove deepseek thinking block if present
      const thinkMatch = resultText.match(/<think>[\s\S]*?<\/think>/);
      if (thinkMatch) {
        resultText = resultText.replace(thinkMatch[0], '');
      }

      const cleanedText = resultText.trim();

      const id = crypto.randomUUID();

      const { supabase, db } = await getDb();
      if (supabase) {
        const { error } = await supabase.from('marketing_queries').insert([{ id, query_text, ai_output: cleanedText, lead_score: 0 }]);
        if (error) console.error("Failed to insert query to supabase", error);
      } else if (db) {
        const stmt = db.prepare(`
          INSERT INTO marketing_queries (id, query_text, ai_output, lead_score)
          VALUES (?, ?, ?, ?)
        `);
        stmt.run(id, query_text, cleanedText, 0);
      }

      res.json({
        id,
        preview: cleanedText
      });
    } catch (error: any) {
      console.error("Error generating query:", error);
      res.status(500).json({ error: error.message || "Failed to generate architecture" });
    }
  });

  // Unlock full query
  app.post("/api/unlock-query", async (req, res) => {
    try {
      const { id, name, email } = req.body;
      if (!id || !name || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { supabase, db } = await getDb();
      if (supabase) {
        let { data: subData } = await supabase.from('subscribers').select('*').eq('email', email).single();
        if (!subData) {
          await supabase.from('subscribers').insert([{ email, name, total_queries: 1 }]);
        } else {
          await supabase.from('subscribers').update({ total_queries: (subData.total_queries || 0) + 1 }).eq('email', email);
        }
        
        await supabase.from('marketing_queries').update({ email }).eq('id', id);

        const { data: qData, error: qError } = await supabase.from('marketing_queries').select('ai_output').eq('id', id).single();
        if (qError || !qData) return res.status(404).json({ error: "Query not found" });

        let fullBlueprint;
        try {
          fullBlueprint = JSON.parse(qData.ai_output);
        } catch (e) {
          fullBlueprint = qData.ai_output;
        }
        return res.json({ blueprint: fullBlueprint });
      } else if (db) {
        // Check or create subscriber
        let subscriber = db.prepare("SELECT * FROM subscribers WHERE email = ?").get(email) as any;

        if (!subscriber) {
          db.prepare("INSERT INTO subscribers (email, name, total_queries) VALUES (?, ?, 0)").run(email, name);
          subscriber = { email, name, total_queries: 0 };
        }

        // Update query with email
        db.prepare("UPDATE marketing_queries SET email = ? WHERE id = ?").run(email, id);

        // Increment queries
        db.prepare("UPDATE subscribers SET total_queries = total_queries + 1 WHERE email = ?").run(email);

        // Get full output
        const queryRow = db.prepare("SELECT ai_output FROM marketing_queries WHERE id = ?").get(id) as any;
        if (!queryRow) {
          return res.status(404).json({ error: "Query not found" });
        }

        const fullBlueprint = JSON.parse(queryRow.ai_output);
        return res.json({ blueprint: fullBlueprint });
      } else {
        return res.status(500).json({ error: "No database available to retrieve the request." });
      }

    } catch (error) {
      console.error("Error unlocking query:", error);
      res.status(500).json({ error: "Failed to unlock architecture" });
    }
  });

  // Get all queries (Admin)
  app.get("/api/queries", async (req, res) => {
    try {
      const { supabase, db } = await getDb();
      let queries = [];

      if (supabase) {
        const { data } = await supabase.from('marketing_queries').select('*').order('created_at', { ascending: false });
        queries = data || [];
      } else if (db) {
        const stmt = db.prepare("SELECT * FROM marketing_queries ORDER BY lead_score DESC, created_at DESC");
        queries = stmt.all();
      }

      const parsedQueries = queries.map((q: any) => {
        try {
         return { ...q, ai_output: JSON.parse(q.ai_output) };
        } catch {
         return q;
        }
      });

      res.json(parsedQueries);
    } catch (error) {
      console.error("Error fetching queries:", error);
      res.status(500).json({ error: "Failed to fetch queries" });
    }
  });

  // Generate Blueprint using DeepSeek (or Gemini fallback)
  app.post("/api/generate-blueprint", async (req, res) => {
    try {
      const formData = req.body;
      if (!formData || typeof formData !== 'object') {
        return res.status(400).json({ error: "Invalid request payload" });
      }
      if (!formData.businessIdea || typeof formData.businessIdea !== 'string') {
        return res.status(400).json({ error: "Business Idea is required" });
      }

      const prompt = `
        You are a professional Marketing Stack Architect. Analyze the following business details and create a comprehensive Marketing Architecture Blueprint.
        
        Business Details:
        - Website URL: ${formData.websiteUrl || 'N/A'}
        - Business Idea/Description: ${formData.businessIdea || 'N/A'}
        - Current Tools: ${formData.currentTools || 'None'}
        - Business Type: ${formData.businessType}
        - Budget Range: ${formData.budgetRange}
        - Target Audience: ${formData.targetAudience || 'General'}
        - Geography: ${formData.geography}
        - Growth Goal: ${formData.growthGoal}
        
        Keep your reasoning concise. Provide a highly professional, structured response in JSON format matching this exact schema:
        {
          "businessModelAnalysis": "Professional breakdown of the business model",
          "funnelStrategy": "Diagram-style explanation in text format",
          "recommendedStack": [
            { "layer": "e.g., Website CMS", "tool": "Specific tool", "why": "Brief justification" }
          ],
          "dataAndTrackingSetup": "Tracking architecture recommendations",
          "automationPlan": "Suggested automation workflows",
          "ninetyDayRoadmap": [
            { "phase": "e.g., Phase 1: Foundation", "description": "Details" }
          ],
          "estimatedBudgetTiers": [
            { "tier": "e.g., Free", "cost": "$0", "description": "Details" }
          ],
          "strategicNotes": "CRO suggestions and AI integrations"
        }
        
        Ensure the tone is authoritative and strategic, fitting a high-end marketing consultancy.
        Return ONLY valid JSON. Do not include markdown code blocks like \`\`\`json.
      `;

      let resultText = "";

      if (process.env.OPENROUTER_API_KEY) {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://theboringstack.com",
            "X-Title": "TheBoringStack",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 2048
          })
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        resultText = data.choices[0].message.content;
      } else {
        throw new Error("No API key provided. Please set OPENROUTER_API_KEY.");
      }

      // Remove deepseek thinking block
      const thinkMatch = resultText.match(/<think>[\s\S]*?<\/think>/);
      if (thinkMatch) {
        resultText = resultText.replace(thinkMatch[0], '');
      }

      // Clean up potential markdown formatting from the response
      const cleanedText = resultText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

      let blueprint;
      try {
        blueprint = JSON.parse(cleanedText);
      } catch (err) {
        console.error("JSON parsing error:", err, "Cleaned text:", cleanedText);
        throw new Error("Failed to parse the AI architecture response into JSON.");
      }

      res.json(blueprint);
    } catch (error) {
      console.error("Error generating blueprint:", error);
      res.status(500).json({ error: "Failed to generate blueprint" });
    }
  });

  // Save a blueprint
  app.post("/api/blueprints", async (req, res) => {
    try {
      const { id, business_name, input_data, ai_output } = req.body;

      if (!id || !business_name || !input_data || !ai_output) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const { supabase, db } = await getDb();
      if (supabase) {
        await supabase.from('marketing_blueprints').insert([{
           id, business_name, input_data: JSON.stringify(input_data), ai_output: JSON.stringify(ai_output)
        }]);
      } else if (db) {
        const stmt = db.prepare(`
          INSERT INTO marketing_blueprints (id, business_name, input_data, ai_output)
          VALUES (?, ?, ?, ?)
        `);
        stmt.run(id, business_name, JSON.stringify(input_data), JSON.stringify(ai_output));
      }

      res.status(201).json({ success: true, id });
    } catch (error) {
      console.error("Error saving blueprint:", error);
      res.status(500).json({ error: "Failed to save blueprint" });
    }
  });

  // Get all blueprints (Admin)
  app.get("/api/blueprints", async (req, res) => {
    try {
      const { supabase, db } = await getDb();
      let blueprints = [];

      if (supabase) {
        const { data } = await supabase.from('marketing_blueprints').select('*').order('created_at', { ascending: false });
        blueprints = data || [];
      } else if (db) {
        const stmt = db.prepare("SELECT * FROM marketing_blueprints ORDER BY created_at DESC");
        blueprints = stmt.all();
      }

      // Parse JSON strings back to objects
      const parsedBlueprints = blueprints.map((bp: any) => {
        try {
          return {
            ...bp,
            input_data: JSON.parse(bp.input_data),
            ai_output: JSON.parse(bp.ai_output)
          };
        } catch {
          return bp;
        }
      });

      res.json(parsedBlueprints);
    } catch (error) {
      console.error("Error fetching blueprints:", error);
      res.status(500).json({ error: "Failed to fetch blueprints" });
    }
  });

  // Delete a blueprint
  app.delete("/api/blueprints", async (req, res) => {
    try {
      const id = req.query.id as string;
      if (!id) {
        return res.status(400).json({ error: "ID is required" });
      }
      
      const { supabase, db } = await getDb();
      if (supabase) {
        await supabase.from('marketing_blueprints').delete().eq('id', id);
      } else if (db) {
        const stmt = db.prepare("DELETE FROM marketing_blueprints WHERE id = ?");
        stmt.run(id);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blueprint:", error);
      res.status(500).json({ error: "Failed to delete blueprint" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const PORT = 3000;
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
  }

export default app;
