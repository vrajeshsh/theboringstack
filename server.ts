import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from 'resend';
import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("✅ Lazy-initialized Supabase");
  } else {
    // If we are on Vercel and missing these, we MUST error out clearly
    if (process.env.VERCEL) {
      console.error("❌ CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on Vercel.");
      throw new Error("Missing Supabase configuration. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel Environment Variables.");
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
      throw new Error("No database available. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Vercel.");
    }
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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Generate Blueprint from simple query
app.post("/api/generate-query", async (req, res) => {
  try {
    const { query_text } = req.body;
    if (!query_text) return res.status(400).json({ error: "Query text is required" });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing from environment variables.");

    const prompt = `
      You are the **Lead Growth Marketing Architect** at **TheBoringStack**. Design a high-performance infrastructure.
      Client Context: "${query_text}"
      CRITICAL: Do not use asterisks (*). Use plain text or standard Markdown headers (#). executive tone.
    `;

    const data = await safeFetchJson("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
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

    let resultText = data.choices[0].message.content;
    const thinkMatch = resultText.match(/<think>[\s\S]*?<\/think>/);
    if (thinkMatch) resultText = resultText.replace(thinkMatch[0], '');
    
    const cleanedText = resultText.trim();
    const id = Math.random().toString(36).substring(2, 15);
    const { supabase, db } = await getDb();

    if (supabase) {
      const { error } = await supabase.from('marketing_queries').insert([{ id, query_text, ai_output: cleanedText, lead_score: 0 }]);
      if (error) throw error;
    } else {
      db.prepare(`INSERT INTO marketing_queries (id, query_text, ai_output, lead_score) VALUES (?, ?, ?, ?)`).run(id, query_text, cleanedText, 0);
    }

    res.json({ id, preview: cleanedText });
  } catch (error: any) {
    console.error("API Error (/api/generate-query):", error);
    res.status(500).json({ error: "Failed to generate architecture", details: error.message });
  }
});

// Unlock full query
app.post("/api/unlock-query", async (req, res) => {
  try {
    const { id, name, email } = req.body;
    if (!id || !name || !email) return res.status(400).json({ error: "Missing required fields" });

    const { supabase, db } = await getDb();
    let previewText = "";
    let queryText = "";

    if (supabase) {
      const { data: subData } = await supabase.from('subscribers').select('*').eq('email', email).single();
      if (!subData) {
        await supabase.from('subscribers').insert([{ email, name, total_queries: 1 }]);
      } else {
        await supabase.from('subscribers').update({ total_queries: (subData.total_queries || 0) + 1 }).eq('email', email);
      }
      const { data: qData, error: qError } = await supabase.from('marketing_queries').update({ email }).eq('id', id).select().single();
      if (qError || !qData) return res.status(404).json({ error: "Query not found" });
      previewText = qData.ai_output;
      queryText = qData.query_text;
    } else {
      let subscriber = db.prepare("SELECT * FROM subscribers WHERE email = ?").get(email);
      if (!subscriber) db.prepare("INSERT INTO subscribers (email, name, total_queries) VALUES (?, ?, 0)").run(email, name);
      db.prepare("UPDATE marketing_queries SET email = ? WHERE id = ?").run(email, id);
      db.prepare("UPDATE subscribers SET total_queries = total_queries + 1 WHERE email = ?").run(email);
      const queryRow = db.prepare("SELECT ai_output, query_text FROM marketing_queries WHERE id = ?").get(id);
      if (!queryRow) return res.status(404).json({ error: "Query not found" });
      previewText = queryRow.ai_output;
      queryText = queryRow.query_text;
    }

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold").setFontSize(22).text("TheBoringStack Blueprint", 20, 30);
    doc.setFont("helvetica", "normal").setFontSize(12).text(`Prepared for: ${name}`, 20, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 52);
    doc.setFont("helvetica", "bold").text("Original Query:", 20, 65);
    doc.setFont("helvetica", "italic").text(doc.splitTextToSize(queryText, 170), 20, 72);
    doc.setFont("helvetica", "bold").text("Your Marketing Architecture:", 20, 95);
    doc.setFont("helvetica", "normal").text(doc.splitTextToSize(previewText, 170), 20, 102);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    if (process.env.RESEND_API_KEY) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'vrajeshshah13@gmail.com';
      try {
        await resend.emails.send({
          from: fromEmail, to: email, bcc: adminEmail,
          subject: 'Your Growth Marketing Blueprint',
          html: `<p>Hi ${name},</p><p>Thanks for using <strong>TheBoringStack</strong>. I've attached your custom growth architecture blueprint.</p>`,
          attachments: [{ filename: 'Growth_Architecture_Blueprint.pdf', content: pdfBuffer }],
        });
      } catch (resendErr: any) {
        console.warn("Caught Resend Error:", resendErr.message);
      }
    }

    res.json({ success: true, blueprint: previewText });
  } catch (error: any) {
    console.error("API Error (/api/unlock-query):", error);
    res.status(500).json({ error: "Failed to unlock architecture", details: error.message });
  }
});

// Admin endpoints
app.get("/api/queries", async (req, res) => {
  try {
    const { supabase, db } = await getDb();
    let queries = supabase 
      ? (await supabase.from('marketing_queries').select('*').order('created_at', { ascending: false })).data
      : db.prepare("SELECT * FROM marketing_queries ORDER BY created_at DESC").all();

    res.json(queries.map((q: any) => ({ ...q, ai_output: (typeof q.ai_output === 'string') ? JSON.parse(q.ai_output) : q.ai_output })));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch queries", details: error.message });
  }
});

async function setup() {
  if (process.env.NODE_ENV !== "production") {
    const PORT = 3000;
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
  }
}

setup();
export default app;
