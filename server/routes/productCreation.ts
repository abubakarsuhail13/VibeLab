import express from 'express';
import { GoogleGenAI } from "@google/genai";
import { getPool } from '../db.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment settings.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Safe Gemini parse pattern for ALL calls in this file:
// const raw = data.content.map(i => i.text || '').join('');
// const clean = raw.replace(/```json|```|```html/g, '').trim();
function parseGeminiResponse(data: any): string {
  let raw = '';
  if (data && data.content && Array.isArray(data.content)) {
    raw = data.content.map((i: any) => i.text || '').join('');
  } else if (data && data.text) {
    raw = data.text;
  } else if (data && data.candidates && data.candidates[0]?.content?.parts) {
    raw = data.candidates[0].content.parts.map((p: any) => p.text || '').join('');
  } else if (data && data.candidates && data.candidates[0]?.content) {
    const content = data.candidates[0].content;
    if (Array.isArray(content.parts)) {
      raw = content.parts.map((i: any) => i.text || '').join('');
    } else if (content.text) {
      raw = content.text;
    }
  }
  
  return raw.replace(/```json|```|```html/g, '').trim();
}

function safeParseJSON(val: any, fallback: any = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (err) {
    return fallback;
  }
}

// 1. POST /api/product/start
router.post('/start', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    // Get user's latest completed ideation blueprint
    const [blueprints]: any = await p.execute(
      'SELECT * FROM project_blueprints WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (!blueprints || blueprints.length === 0) {
      return res.status(400).json({ error: 'Please complete Phase 1: Discovery & Ideation first.' });
    }

    const pb = blueprints[0];

    // Create a new in-progress product session
    const [sessResult]: any = await p.execute(
      'INSERT INTO product_sessions (user_id, ideation_session_id, current_step, status) VALUES (?, ?, "blueprint", "in_progress")',
      [userId, pb.session_id || pb.id]
    );
    const sessionId = sessResult.insertId;

    // Call Gemini to pre-generate concrete blueprint from ideation data
    const prompt = `
      You are an expert AI Product Manager. Convert the following Phase 1: Discovery & Ideation data into a structured product blueprint.
      
      Product name idea: ${pb.product_name || 'Autonomous App'}
      Problem Statement: ${pb.problem_statement || 'N/A'}
      Target User Persona: ${pb.target_user_persona || 'N/A'}
      Solution Concept: ${pb.solution_concept || 'N/A'}
      AI Opportunity Map: ${pb.ai_opportunity_map || '[]'}
      MVP Definition: ${pb.mvp_definition || 'N/A'}
      Product Features: ${pb.product_features || '[]'}
      
      Format the output as a valid JSON object matching the schema below:
      {
        "project_name": "Polished name for the project",
        "problem_statement": "Refined, impact-focused problem statement (1-2 sentences)",
        "target_users": "Clear definition of who benefits from this product (1-2 sentences)",
        "mvp_scope": "Focused scope of what the MVP will accomplish (2-3 sentences)"
      }
      
      Return ONLY a valid JSON object matching the schema, with no markdown formatting and no preamble.
    `;

    const geminiRes = await getGeminiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const clean = parseGeminiResponse(geminiRes);
    const blueprintObj = JSON.parse(clean);

    // Save pre-generated blueprint to product_blueprints
    await p.execute(
      `INSERT INTO product_blueprints (session_id, user_id, project_name, problem_statement, target_users, mvp_scope, student_approved)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [sessionId, userId, blueprintObj.project_name, blueprintObj.problem_statement, blueprintObj.target_users, blueprintObj.mvp_scope]
    );

    // Retrieve saved blueprint
    const [savedBp]: any = await p.execute(
      'SELECT * FROM product_blueprints WHERE session_id = ?',
      [sessionId]
    );

    res.json({
      session_id: sessionId,
      blueprint: savedBp[0]
    });
  } catch (error: any) {
    console.error('Failed to start product session:', error);
    res.status(500).json({ error: error.message || 'Failed to start product creation session' });
  }
});

// 2. GET /api/product/session
router.get('/session', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    const [sessions]: any = await p.execute(
      'SELECT * FROM product_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (!sessions || sessions.length === 0) {
      return res.json({
        session: null,
        blueprint: null,
        features: [],
        user_journey: null,
        screens: [],
        mvp: null
      });
    }

    const session = sessions[0];
    const sessionId = session.id;

    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [sessionId]);
    const blueprint = bpRows && bpRows.length > 0 ? bpRows[0] : null;

    const [features]: any = await p.execute('SELECT * FROM product_features WHERE session_id = ?', [sessionId]);

    const [journeyRows]: any = await p.execute('SELECT * FROM user_journeys WHERE session_id = ?', [sessionId]);
    const user_journey = journeyRows && journeyRows.length > 0 ? {
      ...journeyRows[0],
      steps: safeParseJSON(journeyRows[0].steps, []),
      key_actions: safeParseJSON(journeyRows[0].key_actions, [])
    } : null;

    const [screens]: any = await p.execute('SELECT * FROM product_screens WHERE session_id = ?', [sessionId]);

    const [mvpRows]: any = await p.execute('SELECT * FROM mvp_builds WHERE session_id = ?', [sessionId]);
    const mvp = mvpRows && mvpRows.length > 0 ? {
      ...mvpRows[0],
      key_talking_points: safeParseJSON(mvpRows[0].key_talking_points, [])
    } : null;

    res.json({
      session,
      blueprint,
      features: features || [],
      user_journey,
      screens: screens || [],
      mvp
    });
  } catch (error: any) {
    console.error('Failed to get product session:', error);
    res.status(500).json({ error: 'Failed to retrieve active product creation session' });
  }
});

// 3. POST /api/product/blueprint/approve
router.post('/blueprint/approve', authenticateToken, async (req: any, res) => {
  const { session_id, project_name, problem_statement, target_users, mvp_scope } = req.body;

  if (!session_id || !project_name || !problem_statement || !target_users || !mvp_scope) {
    return res.status(400).json({ error: 'Missing required blueprint approval fields' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Save edited fields, set student_approved = TRUE, register approval timestamp
    await p.execute(
      `UPDATE product_blueprints 
       SET project_name = ?, problem_statement = ?, target_users = ?, mvp_scope = ?, student_approved = TRUE, approved_at = CURRENT_TIMESTAMP
       WHERE session_id = ?`,
      [project_name, problem_statement, target_users, mvp_scope, session_id]
    );

    // Call Gemini to generate feature suggestions based on approved metadata
    const prompt = `
      You are an expert AI Product Owner. Based on the approved project blueprint below, suggest a crisp, highly functional list of 6 to 8 key features for their MVP app.
      
      Project Name: ${project_name}
      Problem Statement: ${problem_statement}
      Target Users: ${target_users}
      MVP Scope: ${mvp_scope}
      
      Generate a valid JSON array of features. Please strictly categorize them into:
      - 'must_have': Vital core features necessary to prove the MVP (at least 3 features).
      - 'nice_to_have': Enhance the experience without being critical (2 features).
      - 'future': Long-term vision features that are out of scope for the MVP (1-2 features).
      
      Return ONLY a valid JSON list matching this schema with no markdown block comments and no preamble:
      [
        {
          "feature_name": "Title of the feature",
          "feature_description": "Clear 1-2 sentence description explaining its functionality and value.",
          "category": "must_have" | "nice_to_have" | "future"
        }
      ]
    `;

    const geminiRes = await getGeminiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const clean = parseGeminiResponse(geminiRes);
    const suggestedFeatures = JSON.parse(clean);

    // Save suggested features to product_features
    for (const f of suggestedFeatures) {
      await p.execute(
        `INSERT INTO product_features (session_id, feature_name, feature_description, category, added_by, is_included)
         VALUES (?, ?, ?, ?, 'ai', TRUE)`,
        [session_id, f.feature_name, f.feature_description, f.category]
      );
    }

    // Update current_step = 'features'
    await p.execute(
      "UPDATE product_sessions SET current_step = 'features' WHERE id = ?",
      [session_id]
    );

    // Retrieve and return all features for the current session
    const [allFeatures]: any = await p.execute(
      'SELECT * FROM product_features WHERE session_id = ?',
      [session_id]
    );

    res.json({ features: allFeatures });
  } catch (error: any) {
    console.error('Failed to approve blueprint:', error);
    res.status(500).json({ error: error.message || 'Failed to approve blueprint and generate feature scope' });
  }
});

// 4. POST /api/product/features/update
router.post('/features/update', authenticateToken, async (req: any, res) => {
  const { session_id, features } = req.body;

  if (!session_id || !Array.isArray(features)) {
    return res.status(400).json({ error: 'Missing or invalid parameters' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    for (const f of features) {
      await p.execute(
        `UPDATE product_features 
         SET is_included = ?, category = ?, student_rationale = ? 
         WHERE id = ? AND session_id = ?`,
        [f.is_included ? 1 : 0, f.category, f.student_rationale || null, f.id, session_id]
      );
    }

    res.json({ updated: true });
  } catch (error: any) {
    console.error('Failed to update features:', error);
    res.status(500).json({ error: 'Failed to update feature selection' });
  }
});

// 4b. POST /api/product/features/add
router.post('/features/add', authenticateToken, async (req: any, res) => {
  const { session_id, feature_name, feature_description, category } = req.body;

  if (!session_id || !feature_name || !feature_description) {
    return res.status(400).json({ error: 'Missing feature parameters' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [result]: any = await p.execute(
      `INSERT INTO product_features (session_id, feature_name, feature_description, category, added_by, is_included)
       VALUES (?, ?, ?, ?, 'student', TRUE)`,
      [session_id, feature_name, feature_description, category || 'must_have']
    );

    const newFeatureId = result.insertId;

    res.json({
      success: true,
      feature: {
        id: newFeatureId,
        feature_name,
        feature_description,
        category: category || 'must_have',
        is_included: true,
        added_by: 'student',
        student_rationale: ''
      }
    });
  } catch (error: any) {
    console.error('Failed to add custom feature:', error);
    res.status(500).json({ error: 'Failed to add custom feature' });
  }
});

// 5. POST /api/product/features/approve
router.post('/features/approve', authenticateToken, async (req: any, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Fetch blueprint and approved features
    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [session_id]);
    if (!bpRows || bpRows.length === 0) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }
    const bp = bpRows[0];

    const [featureRows]: any = await p.execute(
      'SELECT * FROM product_features WHERE session_id = ? AND is_included = 1',
      [session_id]
    );

    // Call Gemini to generate user journey
    const prompt = `
      You are an expert AI UX Researcher. Map out a detailed step-by-step User Journey for the product based on its blueprint and final features list.
      
      Project Name: ${bp.project_name}
      Problem Statement: ${bp.problem_statement}
      Target Users: ${bp.target_users}
      MVP Scope: ${bp.mvp_scope}
      
      Final Selected / Included Features:
      ${featureRows.map((f: any) => `- ${f.feature_name}: ${f.feature_description} (${f.category})`).join('\n')}
      
      Generate 4 to 6 sequence steps describing how a user starts, performs core activities, and achieves a success state using the features.
      Also describe 3 to 5 key actions the user takes during this flow.
      
      Return ONLY a valid JSON object matching this schema with no markdown backticks and no preamble:
      {
        "steps": [
          {
            "step_number": 1,
            "title": "Clear Action Title",
            "description": "Short explanation of the user task and interaction behavior (1-2 sentences)"
          }
        ],
        "key_actions": [
          "First action text",
          "Second action text"
        ]
      }
    `;

    const geminiRes = await getGeminiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const clean = parseGeminiResponse(geminiRes);
    const parsedJourney = JSON.parse(clean);

    // Save to user_journeys table
    await p.execute(
      `INSERT INTO user_journeys (session_id, steps, key_actions, approved, approved_at)
       VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)`,
      [session_id, JSON.stringify(parsedJourney.steps), JSON.stringify(parsedJourney.key_actions)]
    );

    // Update current_step = 'user_journey'
    await p.execute(
      "UPDATE product_sessions SET current_step = 'user_journey' WHERE id = ?",
      [session_id]
    );

    const [journeyRows]: any = await p.execute('SELECT * FROM user_journeys WHERE session_id = ?', [session_id]);
    const savedJourney = {
      ...journeyRows[0],
      steps: safeParseJSON(journeyRows[0].steps, []),
      key_actions: safeParseJSON(journeyRows[0].key_actions, [])
    };

    res.json({ user_journey: savedJourney });
  } catch (error: any) {
    console.error('Failed to approve features:', error);
    res.status(500).json({ error: error.message || 'Failed to approve features and generate user journey' });
  }
});

// 6. POST /api/product/journey/approve
router.post('/journey/approve', authenticateToken, async (req: any, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [session_id]);
    if (!bpRows || bpRows.length === 0) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }
    const bp = bpRows[0];

    const [journeyRows]: any = await p.execute('SELECT * FROM user_journeys WHERE session_id = ?', [session_id]);
    const journey = journeyRows[0] || {};

    const [featureRows]: any = await p.execute(
      'SELECT * FROM product_features WHERE session_id = ? AND is_included = 1',
      [session_id]
    );

    const prompt = `
      You are an expert Frontend Designer. Generate 3 to 4 core product user screens as beautiful, responsive, glassmorphic layout modules built with Tailwind CSS.
      
      Project details:
      Name: ${bp.project_name}
      Problem Statement: ${bp.problem_statement}
      Target Users: ${bp.target_users}
      MVP Scope: ${bp.mvp_scope}
      
      User Journey:
      ${journey.steps ? JSON.stringify(safeParseJSON(journey.steps)) : ''}
      
      Approved Features:
      ${featureRows.map((f: any) => `- ${f.feature_name}: ${f.feature_description}`).join('\n')}
      
      Create 3 or 4 distinctive, fully responsive screen components. The 'layout_html' for each screen MUST be a clean container HTML body utilizing standard Tailwind utility classes, complete with elegant typography, spacing, mock action buttons, beautiful SVG icons, grids, and mock data tables/charts to represent a high-fidelity visual preview. Use deep slate dark modes or classy clean layouts.
      
      Return ONLY a valid JSON list of screens, with no markdown backticks and no preamble:
      [
        {
          "screen_name": "Screen Title (e.g. Dashboard)",
          "screen_description": "Summary explaining the views and context.",
          "screen_purpose": "Core task or action for the user on this screen",
          "layout_html": "FULL container HTML styled with Tailwind classes"
        }
      ]
    `;

    const geminiRes = await getGeminiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const clean = parseGeminiResponse(geminiRes);
    const suggestedScreens = JSON.parse(clean);

    // Save screens to product_screens table
    for (const s of suggestedScreens) {
      await p.execute(
        `INSERT INTO product_screens (session_id, screen_name, screen_description, screen_purpose, layout_html)
         VALUES (?, ?, ?, ?, ?)`,
        [session_id, s.screen_name, s.screen_description, s.screen_purpose, s.layout_html]
      );
    }

    // Update current_step = 'screens'
    await p.execute(
      "UPDATE product_sessions SET current_step = 'screens' WHERE id = ?",
      [session_id]
    );

    const [allScreens]: any = await p.execute(
      'SELECT * FROM product_screens WHERE session_id = ?',
      [session_id]
    );

    res.json({ screens: allScreens });
  } catch (error: any) {
    console.error('Failed to approve journey:', error);
    res.status(500).json({ error: error.message || 'Failed to approve user journey and generate screens' });
  }
});

// 7. POST /api/product/screens/approve
router.post('/screens/approve', authenticateToken, async (req: any, res) => {
  const { session_id, change_requests } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [session_id]);
    if (!bpRows || bpRows.length === 0) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }
    const bp = bpRows[0];

    const [featureRows]: any = await p.execute(
      'SELECT * FROM product_features WHERE session_id = ? AND is_included = 1',
      [session_id]
    );

    const [screenRows]: any = await p.execute(
      'SELECT * FROM product_screens WHERE session_id = ?',
      [session_id]
    );

    // If change_requests exists, regenerate screens
    if (change_requests && change_requests.trim() !== '') {
      const prompt = `
        You are an expert Frontend Designer. The student requested these custom adjustments to their screens:
        "${change_requests}"
        
        Here are the current screens:
        ${JSON.stringify(screenRows)}
        
        Regenerate the updated screens incorporating the student's feedback. Maintain 3-4 distinct screens, styled with rich modern Tailwind CSS classes and high-contrast elegant layouts, fully optimized for display previews.
        
        Return ONLY a valid JSON list of screens matching the previous schema, with no markdown backticks and no preamble:
        [
          {
            "screen_name": "Screen Title",
            "screen_description": "...",
            "screen_purpose": "...",
            "layout_html": "..."
          }
        ]
      `;

      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      const regeneratedScreens = JSON.parse(clean);

      // Clean existing screens for session
      await p.execute('DELETE FROM product_screens WHERE session_id = ?', [session_id]);

      // Save regenerated screens in database
      for (const s of regeneratedScreens) {
        await p.execute(
          `INSERT INTO product_screens (session_id, screen_name, screen_description, screen_purpose, layout_html, change_requests)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [session_id, s.screen_name, s.screen_description, s.screen_purpose, s.layout_html, change_requests]
        );
      }

      const [newScreens]: any = await p.execute(
        'SELECT * FROM product_screens WHERE session_id = ?',
        [session_id]
      );

      return res.json({
        screens: newScreens,
        regenerated: true,
        current_step: 'screens'
      });
    }

    // Else: approve screens, generate MVP
    const userId = req.user.userId;

    const systemPrompt = `You are a frontend developer building a working MVP prototype for a student aged 13-16.
Generate a complete single-file HTML with embedded CSS and JavaScript.

Rules:
- HTML, CSS, vanilla JS only — no external libraries or CDN links
- Fully self-contained — works when opened directly in any browser
- All product screens as separate views, navigated with JS (show/hide divs)
- Realistic placeholder/sample data so it looks real and usable
- Clean design: white background, clear fonts, obvious buttons
- Add footer: "Built with VibeLab 🚀"
- Prototype quality — simple and clear, not complex

Return ONLY the complete HTML file.
No markdown. No explanation. No code fences. Just the raw HTML.`;

    const prompt = `
      You are compiling an MVP for a student product session. Build a complete working MVP prototype for:
      Name: ${bp.project_name}
      Problem: ${bp.problem_statement}
      Scope: ${bp.mvp_scope}
      
      Approved Features:
      ${featureRows.map((f: any) => `- ${f.feature_name}: ${f.feature_description}`).join('\n')}
      
      Visual Reference Screens to map:
      ${screenRows.map((s: any) => `* Screen: ${s.screen_name}\nDescription: ${s.screen_description}\nPurpose: ${s.screen_purpose}`).join('\n')}
      
      Return a JSON response matching the following schema, with no markdown backticks and no preamble:
      {
        "mvp_html": "The complete, single-file HTML generated strictly in accordance with the system instruction.",
        "architecture_explanation": "🏗️ How It's Built\\nDescribe how it was made using simple self-contained HTML/CSS/JS in a child-friendly way.\\n\\n✨ What It Does\\nWrite a clear list of the working mock features.\\n\\n👥 Who It Helps\\nWrite who this solves a problem for and how it changes their day."
      }
    `;

    const geminiRes = await getGeminiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
      }
    });

    const clean = parseGeminiResponse(geminiRes);
    const parsedMvp = JSON.parse(clean);

    // Save to mvp_builds table
    await p.execute(
      `INSERT INTO mvp_builds (session_id, user_id, mvp_html, architecture_explanation, status)
       VALUES (?, ?, ?, ?, 'ready_for_review')`,
      [session_id, userId, parsedMvp.mvp_html, parsedMvp.architecture_explanation]
    );

    // Update session current_step = 'review'
    await p.execute(
      "UPDATE product_sessions SET current_step = 'review' WHERE id = ?",
      [session_id]
    );

    res.json({
      mvp_html: parsedMvp.mvp_html,
      architecture_explanation: parsedMvp.architecture_explanation
    });
  } catch (error: any) {
    console.error('Failed to approve screens:', error);
    res.status(500).json({ error: error.message || 'Failed to approve screens and compile MVP build' });
  }
});

// 8. POST /api/product/mvp/approve
router.post('/mvp/approve', authenticateToken, async (req: any, res) => {
  const { session_id, builder_reflection } = req.body;

  if (!session_id || builder_reflection === undefined) {
    return res.status(400).json({ error: 'Missing session_id or builder_reflection' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    // Fetch details for copywriting context
    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [session_id]);
    const bp = bpRows[0] || {};

    const [mvpRows]: any = await p.execute('SELECT * FROM mvp_builds WHERE session_id = ?', [session_id]);
    const mvp = mvpRows[0] || {};

    // Generate Marketing Pitch & Pitching Materials
    const prompt = `
      You are an expert AI Product Marketer. The student has completed and approved their product MVP.
      Generate compelling copywriting and presentation materials for launching/pitching their app:
      
      Project: ${bp.project_name}
      Problem Statement: ${bp.problem_statement}
      MVP Scope: ${bp.mvp_scope}
      Student reflection on build: "${builder_reflection}"
      
      Generate:
      1. Product Description: A polished marketing pitch (2-3 paragraphs) capturing the problem, the innovative solution concept, and target users.
      2. Demo Script: A step-by-step presentation narrative script (approx 250-300 words) guiding the student on how to show of the working single-file MVP to prospective users or pitch to investors.
      3. Talking Points: 4 to 5 high-impact bulleted benefits focusing on user value, technical execution speed, and future scalability.
      
      Return ONLY a valid JSON object matching the schema below, without Markdown comments and no preamble:
      {
        "product_description": "Compelling launch description text...",
        "demo_script": "Step-by-step narrative script...",
        "key_talking_points": ["First talking point", "Second talking point", "Third talking point"]
      }
    `;

    const geminiRes = await getGeminiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const clean = parseGeminiResponse(geminiRes);
    const parsedDeliverables = JSON.parse(clean);

    // Save deliverables, update status to approved, approved_at to NOW
    await p.execute(
      `UPDATE mvp_builds
       SET product_description = ?, demo_script = ?, key_talking_points = ?, builder_reflection = ?, status = 'approved', approved_at = CURRENT_TIMESTAMP
       WHERE session_id = ?`,
      [
        parsedDeliverables.product_description,
        parsedDeliverables.demo_script,
        JSON.stringify(parsedDeliverables.key_talking_points),
        builder_reflection,
        session_id
      ]
    );

    // Update product_sessions table
    await p.execute(
      "UPDATE product_sessions SET status = 'completed', current_step = 'approved' WHERE id = ?",
      [session_id]
    );

    // Fetch Phase IDs
    const [p1Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 1');
    const [p2Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 2');
    const [p3Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 3');
    const phase1Id = p1Rows[0]?.id;
    const phase2Id = p2Rows[0]?.id;
    const phase3Id = p3Rows[0]?.id;

    // Complete Phase 1 and 2, and Unlock Phase 3 (Testing & Validation - order_index=3) inside user_phase_progress
    if (phase1Id) {
      await p.execute(
        `INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage)
         VALUES (?, ?, 'completed', 100)
         ON DUPLICATE KEY UPDATE status = 'completed', progress_percentage = 100`,
        [userId, phase1Id]
      );
    }
    if (phase2Id) {
      await p.execute(
        `INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage)
         VALUES (?, ?, 'completed', 100)
         ON DUPLICATE KEY UPDATE status = 'completed', progress_percentage = 100`,
        [userId, phase2Id]
      );
    }
    if (phase3Id) {
      await p.execute(
        `INSERT INTO user_phase_progress (user_id, phase_id, status, unlocked_at)
         VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE status = 'active', unlocked_at = CURRENT_TIMESTAMP`,
        [userId, phase3Id]
      );
    }

    res.json({
      deliverables: {
        product_description: parsedDeliverables.product_description,
        demo_script: parsedDeliverables.demo_script,
        key_talking_points: parsedDeliverables.key_talking_points
      },
      toast: {
        title: "Phase 2 Complete 🎉",
        message: "Your MVP is ready. Phase 3 — Testing & Validation is now unlocked."
      }
    });
  } catch (error: any) {
    console.error('Failed to approve MVP:', error);
    res.status(500).json({ error: error.message || 'Failed to approve MVP and prepare launch kit' });
  }
});

// 9. GET /api/product/deliverables
router.get('/deliverables', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    // Retrieve the user's latest completed product session
    let [sessRows]: any = await p.execute(
      "SELECT * FROM product_sessions WHERE user_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1",
      [userId]
    );

    // Fallback if none are fully completed yet
    if (!sessRows || sessRows.length === 0) {
      const [allSess]: any = await p.execute(
        "SELECT * FROM product_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        [userId]
      );
      sessRows = allSess;
    }

    if (!sessRows || sessRows.length === 0) {
      return res.status(404).json({ error: 'No active or completed product creation session found' });
    }

    const sessionId = sessRows[0].id;

    // Fetch all related tables
    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [sessionId]);
    const blueprint = bpRows[0] || null;

    const [features]: any = await p.execute('SELECT * FROM product_features WHERE session_id = ? AND is_included = 1', [sessionId]);

    const [journeyRows]: any = await p.execute('SELECT * FROM user_journeys WHERE session_id = ?', [sessionId]);
    const user_journey = journeyRows[0] ? {
      ...journeyRows[0],
      steps: safeParseJSON(journeyRows[0].steps, []),
      key_actions: safeParseJSON(journeyRows[0].key_actions, [])
    } : null;

    const [screens]: any = await p.execute('SELECT * FROM product_screens WHERE session_id = ?', [sessionId]);

    const [mvpRows]: any = await p.execute('SELECT * FROM mvp_builds WHERE session_id = ?', [sessionId]);
    const mvp = mvpRows[0] || null;

    res.json({
      blueprint,
      features: features || [],
      user_journey,
      screens: screens || [],
      mvp_html: mvp?.mvp_html || null,
      product_description: mvp?.product_description || null,
      demo_script: mvp?.demo_script || null,
      talking_points: mvp?.key_talking_points ? safeParseJSON(mvp.key_talking_points, []) : [],
      builder_reflection: mvp?.builder_reflection || null,
      architecture_explanation: mvp?.architecture_explanation || null
    });
  } catch (error: any) {
    console.error('Failed to retrieve deliverables:', error);
    res.status(500).json({ error: 'Failed to retrieve final product deliverables' });
  }
});

// 10. POST /api/product/description/save
router.post('/description/save', authenticateToken, async (req: any, res) => {
  const { session_id, product_description } = req.body;

  if (!session_id || product_description === undefined) {
    return res.status(400).json({ error: 'Missing session_id or product_description' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(
      `UPDATE mvp_builds SET product_description = ? WHERE session_id = ?`,
      [product_description, session_id]
    );

    res.json({ success: true, message: 'Description updated successfully' });
  } catch (error: any) {
    console.error('Failed to save description:', error);
    res.status(500).json({ error: error.message || 'Failed saving description' });
  }
});

// 11. POST /api/product/features/explain
router.post('/features/explain', authenticateToken, async (req: any, res) => {
  const { session_id, feature_id, student_rationale } = req.body;

  if (!session_id || !feature_id || student_rationale === undefined) {
    return res.status(400).json({ error: 'Missing session_id, feature_id or student_rationale' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Fetch feature details
    const [featRows]: any = await p.execute(
      'SELECT id, feature_name, feature_description FROM product_features WHERE id = ? AND session_id = ?',
      [feature_id, session_id]
    );

    if (!featRows || featRows.length === 0) {
      return res.status(404).json({ error: 'Feature not found.' });
    }

    const feat = featRows[0];
    let feedbackText = '';

    if (student_rationale.trim().length > 0) {
      const prompt = `
        You are an empathetic, encouraging startup mentor for a student aged 13-16.
        Review the student's rationale for including a specific feature in their app.
        
        Feature Name: ${feat.feature_name}
        Feature Description: ${feat.feature_description}
        Student's Rationale of why they included it: "${student_rationale}"
        
        Write exactly one professional, highly encouraging sentence of feedback addressing their logic.
        Keep the tone warm, positive, validating, and direct. Use plain, friendly, zero-jargon language. Say things like "Great thinking — this shows real empathy for your users." or "This is a super smart way to make your app easy for everyday users to trust."
        
        Return ONLY the one-sentence feedback. No markdown, no quotes, no extra text.
      `;

      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      feedbackText = parseGeminiResponse(geminiRes).trim();
    } else {
      feedbackText = 'Explain your rationale above to receive a helpful mentor review!';
    }

    // Save to database
    await p.execute(
      `UPDATE product_features SET student_rationale = ?, ai_feedback = ? WHERE id = ? AND session_id = ?`,
      [student_rationale, feedbackText, feature_id, session_id]
    );

    res.json({
      success: true,
      student_rationale,
      ai_feedback: feedbackText
    });
  } catch (error: any) {
    console.error('Failed feature explain:', error);
    res.status(500).json({ error: error.message || 'Failed to save rationale' });
  }
});

// 12. POST /api/product/demo/save
router.post('/demo/save', authenticateToken, async (req: any, res) => {
  const { session_id, demo_script, key_talking_points } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const updates: string[] = [];
    const params: any[] = [];

    if (demo_script !== undefined) {
      updates.push('demo_script = ?');
      params.push(demo_script);
    }

    if (key_talking_points !== undefined) {
      updates.push('key_talking_points = ?');
      params.push(JSON.stringify(key_talking_points));
    }

    if (updates.length > 0) {
      params.push(session_id);
      await p.execute(
        `UPDATE mvp_builds SET ${updates.join(', ')} WHERE session_id = ?`,
        params
      );
    }

    res.json({ success: true, message: 'Demo presentation prepared!' });
  } catch (error: any) {
    console.error('Failed to save demo details:', error);
    res.status(500).json({ error: error.message || 'Failed saving demo details' });
  }
});

// POST /api/product/walkthrough/explain
router.post('/walkthrough/explain', authenticateToken, async (req: any, res) => {
  const { session_id, section_index, project_name, feature_name } = req.body;
  if (session_id === undefined || section_index === undefined) {
    return res.status(400).json({ error: 'Missing session_id or section_index' });
  }

  try {
    const sectionNames = [
      'The File Structure',
      'The Navigation System',
      `The Core Feature: ${feature_name || 'Main Operation'}`,
      `The Additional Feature: ${feature_name || 'Sub-system'}`,
      'The Sample Database / Memory Store'
    ];
    const sectionName = sectionNames[section_index] || 'The Codebase';

    const prompt = `
      You are an inspiring, friendly technical mentor teaching code to high-school beginners (13-16 years old).
      The student is building an app named "${project_name || 'MVP Product'}" and needs to understand its code walkthrough.
      Write a clear, non-technical, plain English explanation (3 sentences maximum) for the file section: "${sectionName}".
      Explain *what this part of the code does* using a simple, relatable real-world analogy. Avoid any deep technical terms like "array.prototype.reduce" or "event loops". Keep the tone extremely positive and encouraging!
      Example style: "Think of this like your app's main highway. It sets up the rules so your clicks know exactly which digital screen to visit next, keeping everything organized and fast!"
      
      Return ONLY the explanation text. No markdown quotes, no labels, no extra text.
    `;

    const geminiRes = await getGeminiClient().models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt
    });

    const explanation = parseGeminiResponse(geminiRes).trim();
    res.json({ success: true, explanation });
  } catch (error: any) {
    console.error('Walkthrough explanation generation failed:', error);
    res.status(500).json({ error: error.message || 'Failed to explain section' });
  }
});

// POST /api/product/step/complete
router.post('/step/complete', authenticateToken, async (req: any, res) => {
  const { session_id, step } = req.body;
  if (!session_id || !step) {
    return res.status(400).json({ error: 'Missing session_id or step name' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Map the completed step to the next database current_step value
    const nextSteps: Record<string, string> = {
      'code_walkthrough': 'description',
      'description': 'explain',
      'explain': 'demo',
      'demo': 'complete'
    };

    const nextStepName = nextSteps[step];
    if (nextStepName) {
      await p.execute(
        'UPDATE product_sessions SET current_step = ? WHERE id = ?',
        [nextStepName, session_id]
      );
    }

    res.json({ success: true, current_step: nextStepName || step });
  } catch (error: any) {
    console.error('Failed to update step progress:', error);
    res.status(500).json({ error: 'Failed to update step progress' });
  }
});

// 13. POST /api/product/quiz/generate
router.post('/quiz/generate', authenticateToken, async (req: any, res) => {
  const { session_id } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [p2Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 2');
    const actualPhase2Id = p2Rows && p2Rows.length > 0 ? p2Rows[0].id : 2;

    // 1. Check if quiz questions already exist for this session
    const [existing]: any = await p.execute(
      'SELECT id, quiz_questions.phase_id, question, options, correct_index, explanation FROM quiz_questions WHERE phase_id = ? AND session_id = ?',
      [actualPhase2Id, session_id]
    );

    if (existing && existing.length > 0) {
      return res.json({ success: true, questions: existing });
    }

    // 2. Fetch blueprint details
    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [session_id]);
    if (!bpRows || bpRows.length === 0) {
      return res.status(404).json({ error: 'Product blueprint not found for this session.' });
    }
    const bp = bpRows[0];

    // 3. Fetch product features
    const [features]: any = await p.execute('SELECT * FROM product_features WHERE session_id = ?', [session_id]);
    const featuresList = features.map((f: any) => `- ${f.feature_name}: ${f.feature_description} [${f.category}]`).join('\n');

    // 4. Generate questions using Gemini-3.5-flash
    const prompt = `
Generate 10 multiple choice quiz questions for a Grade 9-12 student
who just built the following product:

Product name: ${bp.project_name || 'Autonomous App'}
Problem it solves: ${bp.problem_statement || 'N/A'}
Target Users: ${bp.target_users || 'N/A'}
MVP Scope: ${bp.mvp_scope || 'N/A'}
Key Features:
${featuresList || 'None listed'}

We want to test if they understand how their product is designed, how it works, and key software design/theory decisions.
Ensure the questions are highly personalized to their product and target users, yet educational about product management, software logic, and MVP design.

Please output as a valid JSON array of objects with this exact structure:
[
  {
    "question": "The question text, references their product directly",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Extremely clear explanation of why the correct option is right based on product design and theory."
  }
]

Return ONLY the valid JSON array. Do not wrap in markdown or backticks.
`;

    const geminiRes = await getGeminiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const clean = parseGeminiResponse(geminiRes);
    const parsedQuestions = JSON.parse(clean);

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      throw new Error("Invalid format returned by Gemini model.");
    }

    // 5. Insert generated questions into the database
    const questionsToFetch: any[] = [];
    for (const q of parsedQuestions) {
      const [insertRes]: any = await p.execute(
        `INSERT INTO quiz_questions (phase_id, session_id, question, options, correct_index, explanation)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [actualPhase2Id, session_id, q.question, JSON.stringify(q.options), q.correct_index, q.explanation]
      );
      questionsToFetch.push({
        id: insertRes.insertId,
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation
      });
    }

    res.json({ success: true, questions: questionsToFetch });
  } catch (error: any) {
    console.error('Failed to generate product quiz questions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz questions' });
  }
});

export default router;
