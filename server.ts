import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from 'resend';
import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase (Optional for local, Required for Vercel)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize SQLite Database (Fallback for local dev)
const db = new Database(path.join(__dirname, "blueprints.db"));

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS marketing_blueprints (
    id TEXT PRIMARY KEY,
    business_name TEXT,
    input_data TEXT,
    ai_output TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    email TEXT PRIMARY KEY,
    name TEXT,
    total_queries INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS marketing_queries (
    id TEXT PRIMARY KEY,
    email TEXT,
    query_text TEXT,
    ai_output TEXT,
    lead_score INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

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
        1. **Prosperous Business Overview**: Describe how the user's business will prosper and scale using the right technology stack.
        2. **Growth Potential**: Identify 2-3 strategic areas where AI and modern MarTech will provide the highest ROI.
        3. **Guided Next Steps**: Professionally encourage the user to sign up to receive the **Full Growth Architecture Blueprint** (PDF) which includes tool recommendations, automations, and a 90-day roadmap.

        CRITICAL: Do not use any asterisks (*) for bolding or lists. Use plain text or standard Markdown headers (#) only. Maintain an extremely professional, executive-level tone. Return in clean Markdown.
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
      const id = Math.random().toString(36).substring(2, 15);

      if (supabase) {
        const { error: sbError } = await supabase
          .from('marketing_queries')
          .insert([{ id, query_text, ai_output: cleanedText, lead_score: 0 }]);
        if (sbError) throw sbError;
      } else {
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

      let previewText = "";
      let queryText = "";

      if (supabase) {
        // 1. Check/Create subscriber
        const { data: subData } = await supabase.from('subscribers').select('*').eq('email', email).single();
        if (!subData) {
          await supabase.from('subscribers').insert([{ email, name, total_queries: 1 }]);
        } else {
          await supabase.from('subscribers').update({ total_queries: (subData.total_queries || 0) + 1 }).eq('email', email);
        }

        // 2. Update query and get data
        const { data: qData, error: qError } = await supabase
          .from('marketing_queries')
          .update({ email })
          .eq('id', id)
          .select()
          .single();
        
        if (qError || !qData) return res.status(404).json({ error: "Query not found" });
        previewText = qData.ai_output;
        queryText = qData.query_text;
      } else {
        // SQLite Fallback
        let subscriber = db.prepare("SELECT * FROM subscribers WHERE email = ?").get(email) as any;
        if (!subscriber) {
          db.prepare("INSERT INTO subscribers (email, name, total_queries) VALUES (?, ?, 0)").run(email, name);
        }
        db.prepare("UPDATE marketing_queries SET email = ? WHERE id = ?").run(email, id);
        db.prepare("UPDATE subscribers SET total_queries = total_queries + 1 WHERE email = ?").run(email);
        const queryRow = db.prepare("SELECT ai_output, query_text FROM marketing_queries WHERE id = ?").get(id) as any;
        if (!queryRow) return res.status(404).json({ error: "Query not found" });
        previewText = queryRow.ai_output;
        queryText = queryRow.query_text;
      }

      // 1. Generate PDF
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("TheBoringStack Blueprint", 20, 30);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Prepared for: ${name}`, 20, 45);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 52);
      
      doc.setFont("helvetica", "bold");
      doc.text("Original Query:", 20, 65);
      doc.setFont("helvetica", "italic");
      const splitQuery = doc.splitTextToSize(queryText, 170);
      doc.text(splitQuery, 20, 72);

      doc.setFont("helvetica", "bold");
      doc.text("Your Marketing Architecture:", 20, 95);
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(previewText, 170);
      doc.text(splitText, 20, 102);

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      // 2. Send Email via Resend
      if (process.env.RESEND_API_KEY) {
        console.log(`Attempting to send email to ${email}...`);
        
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'vrajeshshah13@gmail.com';

        try {
          const { data, error } = await resend.emails.send({
            from: fromEmail, 
            to: email,
            bcc: adminEmail, // Send a copy to admin
            subject: 'Your Growth Marketing Blueprint',
            html: `
              <div style="font-family: serif; line-height: 1.6; color: #1a1a1a;">
                <h1 style="font-style: italic;">Hi ${name},</h1>
                <p>Thanks for using <strong>TheBoringStack</strong>. I've attached your custom growth architecture blueprint based on your query.</p>
                <p>I build these systems for a living. If you want to discuss how to actually implement this stack or need a deeper audit, just reply to this email or <a href="https://theboringstack.com/about#contact">book a chat here</a>.</p>
                <p>Best,<br>Vrajesh Shah<br><em>Founder, TheBoringStack</em></p>
              </div>
            `,
            attachments: [
              {
                filename: 'Growth_Architecture_Blueprint.pdf',
                content: pdfBuffer,
              },
            ],
          });

          if (error) {
            // Check if it's the "onboarding" mode restriction
            if (error.message.includes("can only send to your own email")) {
              console.warn(`RESEND RESTRICTION: Could not send to ${email} (unverified in onboarding mode). BCC to ${adminEmail} should still work.`);
            } else {
              console.error("Resend API Error:", error);
              throw new Error("Failed to send email via Resend");
            }
          } else {
            console.log("Email sent successfully:", data);
          }
        } catch (resendErr: any) {
          console.warn("Caught Resend Error:", resendErr.message);
          // If we are in dev/onboarding mode, we don't want to break the user flow just because the email didn't send to a 3rd party
          if (!resendErr.message.includes("can only send to your own email")) {
             throw resendErr;
          }
        }
      } else {
        console.warn("RESEND_API_KEY not found in environment.");
      }

      res.json({ success: true, message: "Blueprint sent to your email.", blueprint: previewText });

    } catch (error) {
      console.error("Error unlocking query:", error);
      res.status(500).json({ error: "Failed to unlock architecture" });
    }
  });

  // Get all queries (Admin)
  app.get("/api/queries", async (req, res) => {
    try {
      let queries = [];
      if (supabase) {
        const { data, error } = await supabase
          .from('marketing_queries')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        queries = data;
      } else {
        const stmt = db.prepare("SELECT * FROM marketing_queries ORDER BY lead_score DESC, created_at DESC");
        queries = stmt.all();
      }

      const parsedQueries = queries.map((q: any) => {
        let aiOutput = q.ai_output;
        if (typeof aiOutput === 'string') {
          try {
            aiOutput = JSON.parse(q.ai_output);
          } catch (e) {}
        }
        return { ...q, ai_output: aiOutput };
      });

      res.json(parsedQueries);
    } catch (error) {
      console.error("Error fetching queries:", error);
      res.status(500).json({ error: "Failed to fetch queries" });
    }
  });

  // Save a blueprint
  app.post("/api/blueprints", async (req, res) => {
    try {
      const { id, business_name, input_data, ai_output } = req.body;
      if (!id || !business_name || !input_data || !ai_output) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (supabase) {
        const { error } = await supabase
          .from('marketing_blueprints')
          .insert([{ id, business_name, input_data, ai_output }]);
        if (error) throw error;
      } else {
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
      let blueprints = [];
      if (supabase) {
        const { data, error } = await supabase
          .from('marketing_blueprints')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        blueprints = data;
      } else {
        const stmt = db.prepare("SELECT * FROM marketing_blueprints ORDER BY created_at DESC");
        blueprints = stmt.all();
      }

      const parsedBlueprints = blueprints.map((bp: any) => {
        let inputData = bp.input_data;
        let aiOutput = bp.ai_output;
        if (typeof inputData === 'string') try { inputData = JSON.parse(inputData); } catch (e) {}
        if (typeof aiOutput === 'string') try { aiOutput = JSON.parse(aiOutput); } catch (e) {}
        return { ...bp, input_data: inputData, ai_output: aiOutput };
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
      if (!id) return res.status(400).json({ error: "ID is required" });

      if (supabase) {
        const { error } = await supabase.from('marketing_blueprints').delete().eq('id', id);
        if (error) throw error;
      } else {
        const stmt = db.prepare("DELETE FROM marketing_blueprints WHERE id = ?");
        stmt.run(id);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blueprint:", error);
      res.status(500).json({ error: "Failed to delete blueprint" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
