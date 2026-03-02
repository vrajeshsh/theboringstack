import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite Database
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
        You are a senior growth marketing architect with expertise in Martech, CDP, CRM, Automation, Attribution, Paid media, Data architecture, Funnel engineering, and B2B & B2C growth.
        
        Analyze the following business description and growth goal:
        "${query_text}"
        
        Keep your reasoning concise. Provide a highly professional, structured response in JSON format matching this exact schema:
        {
          "businessModelAnalysis": "Professional breakdown of the business model",
          "recommendedStack": [
            { "layer": "e.g., Website CMS", "tool": "Specific tool", "why": "Brief justification" }
          ],
          "architectureAndIntegrations": "How the tools connect and share data",
          "goToMarketStrategy": "Step-by-step GTM plan",
          "coreAutomations": "Key automated workflows to implement",
          "growthLevers": "Primary channels and tactics for growth",
          "ninetyDayRoadmap": [
            { "phase": "e.g., Phase 1: Foundation", "description": "Details" }
          ],
          "estimatedBudgetTiers": [
            { "tier": "e.g., Minimum Viable", "cost": "$X/mo", "description": "Details" }
          ]
        }
        
        No fluff. No emojis. Actionable. Professional. Precise.
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
            model: "deepseek/deepseek-r1",
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

      const cleanedText = resultText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

      let blueprint;
      try {
        blueprint = JSON.parse(cleanedText);
      } catch (err) {
        console.error("JSON parsing error:", err, "Cleaned text:", cleanedText);
        throw new Error("Failed to parse the AI architecture response into JSON.");
      }

      // Basic lead scoring
      let lead_score = 0;
      const lowerQuery = query_text.toLowerCase();
      if (lowerQuery.includes('$') || lowerQuery.includes('budget')) lead_score += 10;
      if (lowerQuery.includes('saas') || lowerQuery.includes('ecommerce') || lowerQuery.includes('b2b')) lead_score += 15;
      if (lowerQuery.includes('scale') || lowerQuery.includes('growth') || lowerQuery.includes('leads')) lead_score += 5;
      if (query_text.length > 100) lead_score += 5;

      const id = Math.random().toString(36).substring(2, 15);

      const stmt = db.prepare(`
        INSERT INTO marketing_queries (id, query_text, ai_output, lead_score)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(id, query_text, JSON.stringify(blueprint), lead_score);

      // Return partial data for preview
      res.json({
        id,
        preview: {
          businessModelAnalysis: blueprint.businessModelAnalysis,
          recommendedStack: blueprint.recommendedStack.slice(0, 2)
        }
      });
    } catch (error) {
      console.error("Error generating query:", error);
      res.status(500).json({ error: "Failed to generate architecture" });
    }
  });

  // Unlock full query
  app.post("/api/unlock-query", (req, res) => {
    try {
      const { id, name, email } = req.body;
      if (!id || !name || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check or create subscriber
      let subscriber = db.prepare("SELECT * FROM subscribers WHERE email = ?").get(email) as any;

      if (!subscriber) {
        db.prepare("INSERT INTO subscribers (email, name, total_queries) VALUES (?, ?, 0)").run(email, name);
        subscriber = { email, name, total_queries: 0 };
      }

      if (subscriber.total_queries >= 3) {
        return res.status(403).json({
          error: "Limit reached",
          message: "Need deeper help? Let's build it together.",
          limitReached: true
        });
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
      res.json({ blueprint: fullBlueprint });

    } catch (error) {
      console.error("Error unlocking query:", error);
      res.status(500).json({ error: "Failed to unlock architecture" });
    }
  });

  // Get all queries (Admin)
  app.get("/api/queries", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM marketing_queries ORDER BY lead_score DESC, created_at DESC");
      const queries = stmt.all();

      const parsedQueries = queries.map((q: any) => ({
        ...q,
        ai_output: JSON.parse(q.ai_output)
      }));

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
            model: "deepseek/deepseek-r1",
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
  app.post("/api/blueprints", (req, res) => {
    try {
      const { id, business_name, input_data, ai_output } = req.body;

      if (!id || !business_name || !input_data || !ai_output) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const stmt = db.prepare(`
        INSERT INTO marketing_blueprints (id, business_name, input_data, ai_output)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(id, business_name, JSON.stringify(input_data), JSON.stringify(ai_output));

      res.status(201).json({ success: true, id });
    } catch (error) {
      console.error("Error saving blueprint:", error);
      res.status(500).json({ error: "Failed to save blueprint" });
    }
  });

  // Get all blueprints (Admin)
  app.get("/api/blueprints", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM marketing_blueprints ORDER BY created_at DESC");
      const blueprints = stmt.all();

      // Parse JSON strings back to objects
      const parsedBlueprints = blueprints.map((bp: any) => ({
        ...bp,
        input_data: JSON.parse(bp.input_data),
        ai_output: JSON.parse(bp.ai_output)
      }));

      res.json(parsedBlueprints);
    } catch (error) {
      console.error("Error fetching blueprints:", error);
      res.status(500).json({ error: "Failed to fetch blueprints" });
    }
  });

  // Delete a blueprint
  app.delete("/api/blueprints/:id", (req, res) => {
    try {
      const { id } = req.params;
      const stmt = db.prepare("DELETE FROM marketing_blueprints WHERE id = ?");
      stmt.run(id);
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
