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

    let blueprintObj = {
      project_name: pb.product_name || 'Autonomous App',
      problem_statement: pb.problem_statement || 'A painful manual challenge requiring automation.',
      target_users: pb.target_user_persona || 'Students and professionals looking to optimize their workflow.',
      mvp_scope: pb.mvp_definition || 'A lightweight, high-productivity tool targeting core functional outputs.'
    };

    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      const parsed = JSON.parse(clean);
      if (parsed && parsed.project_name) {
        blueprintObj = {
          project_name: parsed.project_name || blueprintObj.project_name,
          problem_statement: parsed.problem_statement || blueprintObj.problem_statement,
          target_users: parsed.target_users || blueprintObj.target_users,
          mvp_scope: parsed.mvp_scope || blueprintObj.mvp_scope
        };
      }
    } catch (geminiError) {
      console.warn('Failed to pre-generate blueprint via Gemini, falling back to smart defaults:', geminiError);
    }

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
    let blueprint = bpRows && bpRows.length > 0 ? bpRows[0] : null;

    if (!blueprint || !blueprint.project_name || !blueprint.problem_statement) {
      const [projBpRows]: any = await p.execute(
        `SELECT id, product_name, problem_statement, target_user_persona, mvp_definition 
         FROM project_blueprints WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      if (projBpRows && projBpRows.length > 0) {
        const pb = projBpRows[0];
        blueprint = {
          id: blueprint?.id || pb.id,
          session_id: sessionId,
          user_id: userId,
          project_name: blueprint?.project_name || pb.product_name || '',
          problem_statement: blueprint?.problem_statement || pb.problem_statement || '',
          target_users: blueprint?.target_users || pb.target_user_persona || '',
          mvp_scope: blueprint?.mvp_scope || pb.mvp_definition || '',
          student_approved: blueprint?.student_approved || 0
        };
      }
    }

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
      key_talking_points: safeParseJSON(mvpRows[0].key_talking_points, []),
      skills_learned: safeParseJSON(mvpRows[0].skills_learned, [])
    } : null;

    const [components]: any = await p.execute('SELECT * FROM component_metadata WHERE session_id = ?', [sessionId]);

    res.json({
      session,
      blueprint,
      features: features || [],
      user_journey,
      screens: screens || [],
      mvp,
      component_metadata: components || []
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

    let suggestedFeatures = [];
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      suggestedFeatures = JSON.parse(clean);
    } catch (geminiError: any) {
      console.warn('Failed to generate product features via Gemini, falling back to smart defaults:', geminiError.message || geminiError);
      suggestedFeatures = [
        {
          "feature_name": "User Authentication & Access Profiles",
          "feature_description": "Secure sign-up, registration, and onboarding flows personalized for " + target_users + ".",
          "category": "must_have"
        },
        {
          "feature_name": `${project_name} Centralized Dashboard`,
          "feature_description": "The primary dashboard layout showing relevant summaries, visual lists, and key items.",
          "category": "must_have"
        },
        {
          "feature_name": "Interactive Solver Engine",
          "feature_description": "Core interface mechanism allowing users to perform actions directly solving the main problem: " + problem_statement + ".",
          "category": "must_have"
        },
        {
          "feature_name": "Custom Data Export & History",
          "feature_description": "Enables saving outputs, downloading generated files, and reviewing historical logs.",
          "category": "nice_to_have"
        },
        {
          "feature_name": "Notifications & Reminders Engine",
          "feature_description": "Sends smart notifications to target users based on their active items and status.",
          "category": "nice_to_have"
        },
        {
          "feature_name": "AI Predictive Insights Integration",
          "feature_description": "Synthesizes data inputs to make long-term future predictions and smart actionable suggestions.",
          "category": "future"
        }
      ];
    }

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

    let parsedJourney;
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      parsedJourney = JSON.parse(clean);
    } catch (geminiError) {
      console.warn('Failed to dynamically generate User Journey via Gemini, using smart fallback:', geminiError);
      parsedJourney = {
        steps: [
          {
            step_number: 1,
            title: "Onboarding & Account Entry",
            description: `The user signs up and enters the customizable ${bp.project_name} portal designed specifically for ${bp.target_users}.`
          },
          {
            step_number: 2,
            title: "Dashboard & Main Hub Overview",
            description: `The system displays the primary dashboard loaded with core widgets and features to solve the major problem: "${bp.problem_statement}".`
          },
          {
            step_number: 3,
            title: "Initiating Key Activity Flow",
            description: `The user activates the primary action modules, including: ${featureRows.slice(0, 3).map((f: any) => f.feature_name).join(', ')}.`
          },
          {
            step_number: 4,
            title: "Executing core actions & Customizing State",
            description: `The user inputs their custom settings, completes the main workflow tasks, and adjusts high-value components.`
          },
          {
            step_number: 5,
            title: "Viewing Results & Success Insights",
            description: `The user observes success feedback metrics and completes the core MVP journey with data-rich confirmation details.`
          }
        ],
        key_actions: [
          `Register new user account profile tailored to ${bp.target_users}.`,
          `Browse and configure core dashboard components.`,
          `Trigger main interactive action solvers.`,
          `Review activity records, analytics visualizations, and final success metrics.`
        ]
      };
    }

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

    let suggestedScreens;
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      suggestedScreens = JSON.parse(clean);
    } catch (geminiError) {
      console.warn('Failed to dynamically compile screen layouts via Gemini, using high-fidelity Tailwind fallbacks:', geminiError);
      suggestedScreens = [
        {
          screen_name: "Central Command Dashboard",
          screen_description: `Main interface landing page for ${bp.project_name}, showing live status summaries, active trackers, and personalized metrics for ${bp.target_users}.`,
          screen_purpose: "To provide a complete operational bird's-eye view, review quick stats, and launch core task modules.",
          layout_html: `
            <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
              <div class="flex items-center justify-between mb-8">
                <div>
                  <div class="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Central Console</div>
                  <h1 class="text-2xl font-black tracking-tight">${bp.project_name}</h1>
                </div>
                <div class="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full text-xs text-blue-400 font-semibold animate-pulse">
                  <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Active Prototype
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                  <div class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Primary Target Users</div>
                  <div class="text-lg font-bold mt-1 text-slate-100">${bp.target_users}</div>
                </div>
                <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                  <div class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Identified Core Painpoint</div>
                  <div class="text-sm font-medium mt-1 text-slate-100 line-clamp-2">${bp.problem_statement}</div>
                </div>
                <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                  <div class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Build Status</div>
                  <div class="text-lg font-bold mt-1 text-green-400 font-mono">100% Core Ready</div>
                </div>
              </div>
              <div class="bg-slate-800/20 border border-slate-700/30 rounded-xl p-5 mb-6">
                <h3 class="text-sm font-bold text-slate-300 mb-3">Included MVP Features</h3>
                <div class="space-y-2.5">
                  ${featureRows.slice(0, 4).map((f: any) => `
                    <div class="flex items-start gap-3">
                      <span class="text-blue-500 mt-0.5">✓</span>
                      <div>
                        <div class="text-xs font-bold text-slate-100">${f.feature_name}</div>
                        <div class="text-[11px] text-slate-400 font-medium">${f.feature_description}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="flex justify-end pt-2 border-t border-slate-800/60">
                <button class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform hover:-translate-y-0.5">
                  Explore Workspace
                </button>
              </div>
            </div>
          `
        },
        {
          screen_name: "Action Solver Engine",
          screen_description: `High-fidelity main working canvas solving: "${bp.problem_statement}". Allows user inputs and real-time computation.`,
          screen_purpose: "To handle main user configuration steps, perform core platform operations, and display responsive calculated actions.",
          layout_html: `
            <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 text-lg font-bold">⚙️</div>
                <div>
                  <h2 class="text-lg font-black tracking-tight">Interactive Solution Suite</h2>
                  <p class="text-xs text-slate-400">Perform live computational tasks and generate responsive outputs.</p>
                </div>
              </div>
              <div class="space-y-5 mb-6">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Configure Target Variables</label>
                  <input type="text" placeholder="Enter variable/metadata inputs..." class="w-full bg-slate-800/40 border border-slate-700/60 focus:border-blue-500 text-xs px-4 py-3 rounded-xl outline-none text-slate-200 font-medium placeholder:text-slate-500" />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Specify Focus Parameters</label>
                  <textarea rows="3" placeholder="Define custom settings details..." class="w-full bg-slate-800/40 border border-slate-700/60 focus:border-blue-500 text-xs px-4 py-3 rounded-xl outline-none text-slate-200 font-medium resize-none placeholder:text-slate-500"></textarea>
                </div>
              </div>
              <div class="flex items-center justify-between pt-4 border-t border-slate-800">
                <span class="text-[11px] font-mono text-slate-500">Inputs will process dynamically</span>
                <button class="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md">
                  Execute Simulation
                </button>
              </div>
            </div>
          `
        },
        {
          screen_name: "Audit Logs & Success Insights",
          screen_description: "The historical logs dashboard keeping trace of all user actions, downloadable export spreadsheets, and high-impact reports.",
          screen_purpose: "Review historical work, verify completed tasks, and download compiled custom analytics report summaries.",
          layout_html: `
            <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
              <div class="flex justify-between items-center mb-6">
                <div>
                  <h2 class="text-lg font-black tracking-tight">Optimization Logs & Analytics</h2>
                  <p class="text-xs text-slate-400">Browse historical operations and audit trial states.</p>
                </div>
                <button class="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 border border-slate-700/40 font-bold">
                  📥 Export CSV
                </button>
              </div>
              <div class="overflow-hidden border border-slate-800 rounded-xl mb-6 bg-slate-850">
                <table class="w-full text-left text-xs text-slate-300">
                  <thead class="bg-slate-800/60 text-slate-400 font-bold border-b border-slate-850 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th class="p-3.5">Timestamp</th>
                      <th class="p-3.5">Activity Operation</th>
                      <th class="p-3.5">Status Check</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/40">
                    <tr>
                      <td class="p-3.5 font-mono text-slate-400">Just Now</td>
                      <td class="p-3.5 font-medium">Initial system configuration launched</td>
                      <td class="p-3.5"><span class="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[9px] uppercase tracking-wider rounded">Completed</span></td>
                    </tr>
                    <tr>
                      <td class="p-3.5 font-mono text-slate-400">2 Hours ago</td>
                      <td class="p-3.5 font-medium">Custom environment parameters calibrated</td>
                      <td class="p-3.5"><span class="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[9px] uppercase tracking-wider rounded">Completed</span></td>
                    </tr>
                    <tr>
                      <td class="p-3.5 font-mono text-slate-400">Yesterday</td>
                      <td class="p-3.5 font-medium">Database verification completed</td>
                      <td class="p-3.5"><span class="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[9px] uppercase tracking-wider rounded">Completed</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                <div class="text-xs text-blue-400 font-bold mb-1">💡 Pro Insight Tip</div>
                <p class="text-[11px] text-slate-400 leading-normal">Operational trials indicate a 40% reduction in workflow context-switching when utilizing this consolidated MVP framework.</p>
              </div>
            </div>
          `
        }
      ];
    }

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
      let regeneratedScreens;
      try {
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
        regeneratedScreens = JSON.parse(clean);
      } catch (geminiError) {
        console.warn('Failed to regenerate screens via Gemini, keeping existing with change markers:', geminiError);
        // Fallback: Use existing screens but attach request log info
        regeneratedScreens = screenRows.map((s: any) => ({
          screen_name: s.screen_name,
          screen_description: s.screen_description + " (Custom revisions: " + change_requests + ")",
          screen_purpose: s.screen_purpose,
          layout_html: s.layout_html
        }));
      }

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

ADDITIONAL REQUIREMENT — Component tagging:
Every meaningful interactive element (buttons, forms, key sections, navigation, data displays) must include these HTML data attributes:
  data-component-id="unique_id_here"
  data-component-type="button | form | nav | display | input"
  data-purpose="short description of what this does"

Example:
<button data-component-id="submit_attendance" data-component-type="button" data-purpose="Submits the student's attendance record">Submit</button>

Tag only meaningful elements — not every single div or span.
Aim for 8-15 tagged elements per product depending on complexity.
You MUST write these attributes exactly adjacent to each other in this precise order: data-component-id="..." data-component-type="..." data-purpose="..." inside the HTML tags, with only spaces separating them.

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

    let parsedMvp;
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      parsedMvp = JSON.parse(clean);
    } catch (geminiError) {
      console.warn('Failed to dynamically draft custom MVP HTML via Gemini, compiling click-to-cycle tab prototype local fallback:', geminiError);
      
      const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${bp.project_name} - MVP Prototype</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    </style>
</head>
<body class="bg-indigo-950/20 text-slate-150 min-h-screen flex flex-col font-sans">
    <header data-component-id="app_header" data-component-type="nav" data-purpose="Application navigation and header summary" class="bg-slate-900 border-b border-indigo-900/30 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div class="flex items-center gap-3">
            <span class="text-xl">🚀</span>
            <div>
                <h1 class="text-sm md:text-base font-black tracking-tight text-white">${bp.project_name}</h1>
                <p class="text-[9px] uppercase font-bold tracking-wider text-indigo-400">Interactive MVP Prototyping Module</p>
            </div>
        </div>
        <div class="flex items-center gap-2 text-[10px] font-semibold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-full border border-indigo-950">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live Draft
        </div>
    </header>

    <main class="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">
        <div data-component-id="target_demographics" data-component-type="display" data-purpose="Target demographics banner explaining solved problem statement and key user focus" class="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5">Focus Demographics</span>
                <p class="text-sm font-semibold text-slate-200">Target Users: <span class="text-white font-extrabold">${bp.target_users}</span></p>
                <p class="text-xs text-slate-400 line-clamp-1 mt-0.5">Unlocking solutions for: "${bp.problem_statement}"</p>
            </div>
            <div data-component-id="prototype_badge" data-component-type="display" data-purpose="Static status badge labeling sandbox environments" class="bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold text-[10px] uppercase px-3 py-2 rounded-lg shrink-0">
                MVP Prototype Kit
            </div>
        </div>

        <div data-component-id="tab_navigation" data-component-type="nav" data-purpose="Control bar to switch views between designed screens inside the prototype" class="flex flex-wrap gap-2 mb-6 border-b border-indigo-900/10 pb-4">
            \${screenRows.map((s, idx) => \`
                <button onclick="switchScreen(\\\${idx})" id="tab-\\\${idx}" data-component-id="screen_tab_\\\${idx}" data-component-type="button" data-purpose="Switch active presentation view to \\\${s.screen_name}" class="tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border \\\${idx === 0 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300'\}">
                    \\\${s.screen_name\}
                </button>
            \`).join('')\}
        </div>

        <div data-component-id="screen_views_group" data-component-type="display" data-purpose="Container rendering layout modules of active screen views" class="space-y-6">
            \${screenRows.map((s, idx) => \`
                <div id="screen-\\\${idx}" class="screen-view \\\${idx === 0 ? 'block' : 'hidden'\}">
                    <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl">
                        <div class="mb-5 pb-3 border-b border-slate-800">
                            <h3 class="text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-0.5">Visual Preview Model</h3>
                            <h2 class="text-base font-bold text-white">\\\${s.screen_name\}</h2>
                            <p class="text-xs text-slate-400 mt-1">\\\${s.screen_description\}</p>
                        </div>
                        <div data-component-id="rendered_layout_\\\${idx}" data-component-type="display" data-purpose="Actual presentation view showing widgets and controls of \\\${s.screen_name}" class="bg-slate-950/80 rounded-xl overflow-hidden p-3 border border-slate-800 shadow-inner">
                            \\\${s.layout_html\}
                        </div>
                    </div>
                </div>
            \`).join('')\}
        </div>
    </main>

    <footer class="bg-slate-950/90 text-center py-6 text-[11px] text-slate-500 mt-12 border-t border-slate-900">
        <p class="mb-1">Built with <strong>VibeLab 🚀</strong></p>
        <p class="text-slate-600">Prototyping Sandbox Studio | All Rights Reserved 2026</p>
    </footer>

    <script>
        function switchScreen(activeIdx) {
            document.querySelectorAll('.screen-view').forEach((el, idx) => {
                if (idx === activeIdx) {
                    el.classList.remove('hidden');
                    el.classList.add('block');
                } else {
                    el.classList.add('hidden');
                }
            });

            document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
                if (idx === activeIdx) {
                    btn.className = "tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border bg-indigo-600 border-indigo-600 text-white shadow-lg";
                } else {
                    btn.className = "tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300";
                }
            });
        }
    </script>
</body>
</html>`;

      // Interpolate screen and feature arrays into fallback HTML correctly
      const interpolatedFallback = fallbackHtml
        .replace(/\\\${idx}/g, (_, i) => `idx`) // placeholder replace helper
        .replace(/\\\${s\.screen_name}/g, screenRows[0]?.screen_name || 'Home')
        .replace(/\${screenRows\.map\([\s\S]+?\}\.join\(''\)\}/g, screenRows.map((s: any, idx: number) => `
          <button onclick="switchScreen(${idx})" id="tab-${idx}" data-component-id="screen_tab_${idx}" data-component-type="button" data-purpose="Switch active presentation view to ${s.screen_name}" class="tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${idx === 0 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300'}">
              ${s.screen_name}
          </button>
        `).join(''))
        .replace(/\${screenRows\.map\([\s\S]+?rendered_layout_\\\${idx}[\s\S]+?\}\.join\(''\)\}/g, screenRows.map((s: any, idx: number) => `
          <div id="screen-${idx}" class="screen-view ${idx === 0 ? 'block' : 'hidden'}">
              <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl">
                  <div class="mb-5 pb-3 border-b border-slate-800">
                      <h3 class="text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-0.5">Visual Preview Model</h3>
                      <h2 class="text-base font-bold text-white">${s.screen_name}</h2>
                      <p class="text-xs text-slate-400 mt-1">${s.screen_description}</p>
                  </div>
                  <div data-component-id="rendered_layout_${idx}" data-component-type="display" data-purpose="Actual presentation view showing widgets and controls of ${s.screen_name}" class="bg-slate-950/80 rounded-xl overflow-hidden p-3 border border-slate-800 shadow-inner">
                      ${s.layout_html}
                  </div>
              </div>
          </div>
        `).join(''));

      parsedMvp = {
        mvp_html: interpolatedFallback,
        architecture_explanation: `🏗️ How It's Built\nConfigured as an elegant, interactive single-file browser prototype using self-contained HTML frame modules and tailored Tailwind component visuals.\n\n✨ What It Does\nSets up click-to-navigate live tabs mapping these designed views: ${screenRows.map((s: any) => s.screen_name).join(', ')}, equipped with status parameters and layout outlines.\n\n👥 Who It Helps\nEmpowers ${bp.target_users} to interactively review operational screens and validate workflow logic seamlessly.`
      };
    }

    // Capture component attributes from generated build code matching requested regex list
    const mvpHtml = parsedMvp.mvp_html;
    const componentMatches = mvpHtml.matchAll(
      /data-component-id="([^"]+)"\s+data-component-type="([^"]+)"\s+data-purpose="([^"]+)"/g
    );

    const components: Array<{ id: string; type: string; purpose: string }> = [];
    const seenIds = new Set<string>();

    for (const match of componentMatches) {
      const id = match[1];
      const type = match[2];
      const purpose = match[3];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        components.push({ id, type, purpose });
      }
    }

    // Extra resilient backup element parser in case attributes were formatted with different spacing
    if (components.length === 0) {
      const fallbackRegex = /<[^>]+data-component-id="([^"]+)"[^>]*>/g;
      const elementMatches = [...mvpHtml.matchAll(fallbackRegex)];
      for (const em of elementMatches) {
        const tagContent = em[0];
        const idMatch = tagContent.match(/data-component-id="([^"]+)"/);
        const typeMatch = tagContent.match(/data-component-type="([^"]+)"/);
        const purposeMatch = tagContent.match(/data-purpose="([^"]+)"/);
        if (idMatch && !seenIds.has(idMatch[1])) {
          seenIds.add(idMatch[1]);
          components.push({
            id: idMatch[1],
            type: typeMatch ? typeMatch[1] : 'display',
            purpose: purposeMatch ? purposeMatch[1] : 'Interactive UI section'
          });
        }
      }
    }

    // Absolute fallback: Ensure we always have metadata for explanations tab
    if (components.length === 0) {
      components.push({
        id: 'app_header',
        type: 'nav',
        purpose: 'Top navigation to display product name'
      });
      screenRows.forEach((s: any, idx: number) => {
        components.push({
          id: `screen_tab_${idx}`,
          type: 'button',
          purpose: `Navigate to the ${s.screen_name} application page`
        });
      });
    }

    // Ask Gemini for Simple & Technical explanations + skills learned JSON + AI contribution summary in a single batch call.
    let explanationsJson: any = {
      components: [],
      skills_learned: [],
      ai_contribution_summary: ""
    };

    try {
      const explanationPrompt = `
        You are explaining parts of a student's own product in plain language.
        Student's product: ${bp.project_name}
        Problem it solves: ${bp.problem_statement}

        For each component below, generate two explanations:
        1. Simple — one sentence, no technical terms, for a beginner
        2. Technical — one sentence, may use basic technical terms

        Components:
        ${components.map(c => `- ID: ${c.id}, Type: ${c.type}, Purpose: ${c.purpose}`).join('\n')}

        In addition, based on the features the student approved (${featureRows.map((f: any) => f.feature_name).join(', ')}), infer 3-5 key skills learned (like "User Authentication", "State Management", "Data Display", "Form Handling") indicating if they were demonstrated (true/false) as well as a short 1-2 sentence AI contribution summary of how the AI helped build this applet.

        Return ONLY a valid JSON object matching this schema, with no markdown backticks and no description outside the JSON:
        {
          "components": [
            {
              "component_id": "submit_attendance",
              "business_reason": "why this exists in the product",
              "simple_explanation": "...",
              "technical_explanation": "..."
            }
          ],
          "skills_learned": [
            { "skill": "User Authentication", "demonstrated": true },
            { "skill": "Form Handling", "demonstrated": true }
          ],
          "ai_contribution_summary": "..."
        }
      `;

      const explRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: explanationPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const cleanExpl = parseGeminiResponse(explRes);
      explanationsJson = JSON.parse(cleanExpl);
    } catch (err) {
      console.warn('Failed to generate explanations with Gemini, formulating programmatic high-quality fallback:', err);
      explanationsJson.components = components.map(c => ({
        component_id: c.id,
        business_reason: `To facilitate interactive ${c.type} capabilities within the user interface.`,
        simple_explanation: `This part of the app lets you: ${c.purpose}.`,
        technical_explanation: `An interactive ${c.type} block that lets clients trigger state updates for ${c.purpose}.`
      }));
      explanationsJson.skills_learned = [
        { skill: 'User Interface Construction', demonstrated: true },
        { skill: 'Interactive Controller Bindings', demonstrated: true },
        { skill: 'Responsive Page Layouts', demonstrated: true }
      ];
      explanationsJson.ai_contribution_summary = "Formulated the robust HTML mockup and registered responsive data-component hooks to enable hover inspectability and sandbox rendering.";
    }

    // Clean previous session component explanations
    await p.execute('DELETE FROM component_metadata WHERE session_id = ?', [session_id]);

    // Insert to component_metadata table
    for (const comp of (explanationsJson.components || [])) {
      const origComp = components.find(c => c.id === comp.component_id);
      await p.execute(
        `INSERT INTO component_metadata (session_id, component_id, component_type, purpose, business_reason, simple_explanation, technical_explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          session_id,
          comp.component_id,
          origComp ? origComp.type : 'display',
          origComp ? origComp.purpose : 'App action capability',
          comp.business_reason || '',
          comp.simple_explanation || '',
          comp.technical_explanation || ''
        ]
      );
    }

    // Save to mvp_builds table with skills_learned and ai_contribution_summary included
    const skillsJsonStr = JSON.stringify(explanationsJson.skills_learned || []);
    const aiContribStr = explanationsJson.ai_contribution_summary || '';

    await p.execute(
      `INSERT INTO mvp_builds (session_id, user_id, mvp_html, architecture_explanation, status, skills_learned, ai_contribution_summary)
       VALUES (?, ?, ?, ?, 'ready_for_review', ?, ?)`,
      [session_id, userId, parsedMvp.mvp_html, parsedMvp.architecture_explanation, skillsJsonStr, aiContribStr]
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

    let parsedDeliverables;
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      parsedDeliverables = JSON.parse(clean);
    } catch (geminiError) {
      console.warn('Failed to dynamically draft marketing deliverables via Gemini, utilizing tailored copywriting fallbacks:', geminiError);
      parsedDeliverables = {
        product_description: `Introducing ${bp.project_name || 'My App'}, a pioneering solution intentionally designed to address the unique challenges of ${bp.target_users || 'our target users'}. By focusing specifically on "${bp.problem_statement || 'the core problem'}", this platform simplifies complex workflow barriers and introduces powerful automation to boost everyday productivity.\n\nBuilt as a lightweight, robust MVP prototype, ${bp.project_name || 'our product'} addresses core pain points and replaces clumsy legacy options with an elegant, responsive interface. It is optimized to perform flawlessly while maintaining user privacy and configuration versatility.`,
        demo_script: `Welcome everyone! Today I'm thrilled to demonstrate ${bp.project_name || 'our app'}, an interactive hub specifically engineered for ${bp.target_users || 'our target users'}.\n\nLet's begin by looking at our main layout console, designed to highlight primary stats and upcoming operations instantly. Next, notice how easily we can enter variable parameters inside our Solution Suite. With one simple click, the underlying workspace executes our workflow, saving active checklists and updating historical logs in real-time.\n\nUltimately, this prototype proves we can turn beautiful designs into fully operational solutions in record time. Thank you, and I look forward to answering any questions you have!`,
        key_talking_points: [
          `Specifically designed for ${bp.target_users || 'our target users'} to solve: "${bp.problem_statement || 'the core problem'}".`,
          `High-fidelity single-file architecture guarantees ultra-low load times and zero server footprint during test phases.`,
          `Configured with extensible structural layouts prepared for responsive database integration and multi-device support.`
        ]
      };
    }

    // Save deliverables, update status to approved, approved_at to NOW
    // Fetch approved features
    const [featureRows]: any = await p.execute(
      `SELECT feature_name FROM product_features WHERE session_id = ? AND is_included = 1`,
      [session_id]
    );
    const approved_features_list = featureRows.map((f: any) => f.feature_name).join(', ');

    // Get recommended track / product type
    const [sessionRows]: any = await p.execute(
      `SELECT recommended_track FROM product_sessions WHERE id = ?`,
      [session_id]
    );
    const recommended_track = sessionRows[0]?.recommended_track || 'Web Application';

    const skillsPrompt = `
      Based on these approved product features, analyze what this Grade 9-12 student demonstrated by building this product.
      
      Features: ${approved_features_list || 'Static Screen Design, Multi-screen Prototype'}
      Product type: ${recommended_track}
      
      Return ONLY valid JSON, no markdown:
      {
        "skills_demonstrated": [
          { "skill": "skill name", "demonstrated": true }
        ],
        "overall_skill_percentage": 65,
        "next_skills": ["Authentication", "Search", "Data Storage"]
      }
    `;

    let skillsJson = {
      skills_demonstrated: [
        { skill: 'HTML Structure & Layout', demonstrated: true },
        { skill: 'Interactive Sandbox Elements', demonstrated: true },
        { skill: 'Responsive Screen Design', demonstrated: true }
      ],
      overall_skill_percentage: 65,
      next_skills: ["Authentication", "Search", "Data Storage"]
    };

    try {
      const skillsRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: skillsPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const cleanSkills = parseGeminiResponse(skillsRes);
      skillsJson = JSON.parse(cleanSkills);
    } catch (skillsError) {
      console.warn('Failed to dynamically analyze skills via Gemini, utilizing tailored fallbacks:', skillsError);
    }

    const projectNameStr = bp.project_name || 'your product';
    const ai_contribution_summary = `AI helped build the code structure and screens. You decided which features mattered most and how users would interact with ${projectNameStr}.`;

    await p.execute(
      `UPDATE mvp_builds
       SET product_description = ?, demo_script = ?, key_talking_points = ?, builder_reflection = ?, status = 'approved', approved_at = CURRENT_TIMESTAMP, skills_learned = ?, ai_contribution_summary = ?
       WHERE session_id = ?`,
      [
        parsedDeliverables.product_description,
        parsedDeliverables.demo_script,
        JSON.stringify(parsedDeliverables.key_talking_points),
        builder_reflection,
        JSON.stringify(skillsJson),
        ai_contribution_summary,
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

      try {
        const geminiRes = await getGeminiClient().models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt
        });

        feedbackText = parseGeminiResponse(geminiRes).trim();
      } catch (geminiError) {
        console.warn('Failed to obtain AI startup advisor review response feedback, using dynamic fallback:', geminiError);
        feedbackText = `Outstanding thinking! Including "${feat.feature_name}" shows great engineering maturity and deep empathy for your target audience's core workflow.`;
      }
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

    let explanation = '';
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      explanation = parseGeminiResponse(geminiRes).trim();
    } catch (geminiError) {
      console.warn('Failed to obtain AI technical explanations via Gemini, utilizing friendly backup analogies:', geminiError);
      
      const fallbacksMap: Record<string, string> = {
        'The File Structure': `Think of this like a neat cookbook index. It groups the folders containing layouts, styles, and buttons so you always know exactly where to locate key parts of ${project_name || 'your app'} without getting lost!`,
        'The Navigation System': `This is like the magic maps and hallways in a grand castle. It monitors which navigation tab user clicks, making sure they jump smoothly between different screens of your product in a flash!`,
        'The Core Feature': `This represents the primary engine of ${project_name || 'your product'}. It receives user inputs, performs the heavy lifting calculation, and returns success feedback immediately like a smart kitchen blender!`,
        'The Additional Feature': `This is a helpful bonus gadget for ${project_name || 'your workspace'}. It works in the background to simplify actions, display analytics tips, or format tables beautifully for your target users!`,
        'The Sample Database / Memory Store': `Think of this like your app's digital backpack. It stores completed activities, reports, and approved values safely so they persist when navigating around different views!`
      };
      
      const matchedKey = Object.keys(fallbacksMap).find(key => sectionName.includes(key)) || 'The File Structure';
      explanation = fallbacksMap[matchedKey];
    }
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

    let parsedQuestions;
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      parsedQuestions = JSON.parse(clean);
    } catch (geminiError) {
      console.warn('Failed to dynamically compile customized quiz questions via Gemini, using smart product theory fallbacks:', geminiError);
      parsedQuestions = [
        {
          question: `What is the primary objective of your new product ${bp.project_name || 'My App'}?`,
          options: [
            `To directly resolve: "${bp.problem_statement || 'the core problem statement'}"`,
            "To build the most complex software code possible",
            "To add visual screens without user relevance",
            "To test different third-party database engines"
          ],
          correct_index: 0,
          explanation: `Your MVP blueprint starts by identifying a clear target problem and persona, making the primary focus of ${bp.project_name || 'My App'} directly addressing your user's actual pain points.`
        },
        {
          question: `Who are the primary target users who benefit from ${bp.project_name || 'My App'}?`,
          options: [
            "We don't know who our target group is",
            `${bp.target_users || 'The specific audience defined in the blueprint'}`,
            "Experienced senior developers only",
            "General cloud operations administrators"
          ],
          correct_index: 1,
          explanation: "Defining and prioritizing a target demographic ensures your product's layouts and functionality exactly match real user needs."
        },
        {
          question: "When launching an MVP (Minimum Viable Product), what is the most recommended design guideline?",
          options: [
            "Delay launching until you have built every single future feature concept",
            "Focus strictly on core, high-value must-have features that solve the target problem",
            "Avoid gathering early user feedback completely",
            "Change the product scope daily based on visual inspirations"
          ],
          correct_index: 1,
          explanation: "Launching a lean MVP with essential core functions lets you learn from early real-world user interactions and iterate fast."
        },
        {
          question: "What is the main role of a 'User Journey Map' during application development?",
          options: [
            "To draw decorative shapes in design boards",
            "To visualize the sequential steps a user takes to achieve their goal using your software features",
            "To compile binary machine layout files",
            "To set up secure network firewalls"
          ],
          correct_index: 1,
          explanation: "Mapping the user journey ensures development remains usercentric, tracing exactly how screens and interaction widgets help a user succeed."
        },
        {
          question: "How does the 'Code Walkthrough' stage benefit young software founders?",
          options: [
            "It teaches key programming logic, architectural organization, and code readability",
            "It makes the app run faster automatically",
            "It deletes unapproved databases",
            "It registers corporate trademarks"
          ],
          correct_index: 0,
          explanation: "Going through clean, well-commented code builds strong developer literacy and helps teams debug and adapt their apps."
        }
      ];
    }

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

// Added save-progress helpers for Phase 2 Stepper
router.post('/blueprint/save', authenticateToken, async (req: any, res) => {
  const { session_id, project_name, problem_statement, target_users, mvp_scope } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    await p.execute(
      `UPDATE product_blueprints 
       SET project_name = ?, problem_statement = ?, target_users = ?, mvp_scope = ?
       WHERE session_id = ?`,
      [project_name || '', problem_statement || '', target_users || '', mvp_scope || '', session_id]
    );
    res.json({ success: true, message: 'Blueprint draft saved!' });
  } catch (error: any) {
    console.error('Failed to save blueprint draft:', error);
    res.status(500).json({ error: 'Failed to save blueprint draft' });
  }
});

router.post('/screens/save-requests', authenticateToken, async (req: any, res) => {
  const { session_id, change_requests } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    await p.execute(
      `UPDATE product_screens SET change_requests = ? WHERE session_id = ?`,
      [change_requests || '', session_id]
    );
    res.json({ success: true, message: 'Screen modifications saved!' });
  } catch (err: any) {
    console.error('Failed to save screen requests:', err);
    res.status(500).json({ error: 'Failed to save screen requests' });
  }
});

router.post('/tutor/ask', authenticateToken, async (req: any, res) => {
  const { session_id, component_id, question } = req.body;
  if (!session_id || !question) {
    return res.status(400).json({ error: 'Missing session_id or question' });
  }
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Fetch component details
    const [compRows]: any = await p.execute(
      `SELECT * FROM component_metadata WHERE session_id = ? AND component_id = ?`,
      [session_id, component_id || '']
    );

    const comp = compRows && compRows.length > 0 ? compRows[0] : null;
    const component_type = comp ? comp.component_type : 'UI Component';
    const purpose = comp ? comp.purpose : 'Provide interactive sandbox features';
    const business_reason = comp ? comp.business_reason : 'Facilitate user experience trials';

    const prompt = `
      You are a friendly AI tutor helping a student understand their own product. Answer their question about this specific component in 2-3 sentences. Simple language. Encouraging tone.
      Component: ${component_type} — ${purpose}
      Business reason: ${business_reason}
      Student's question: ${question}
    `;

    const geminiRes = await getGeminiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    const answer = parseGeminiResponse(geminiRes).trim();
    res.json({ answer });
  } catch (err: any) {
    console.error('Failed to answer student question via tutor:', err);
    res.status(500).json({ error: 'Failed to answer student question via tutor' });
  }
});

// GET /api/product/components/:session_id
router.get('/components/:session_id', authenticateToken, async (req: any, res) => {
  const { session_id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [compRows]: any = await p.execute(
      `SELECT * FROM component_metadata WHERE session_id = ?`,
      [session_id]
    );
    res.json(compRows || []);
  } catch (err: any) {
    console.error('Failed to retrieve component metadata:', err);
    res.status(500).json({ error: 'Failed to retrieve component metadata' });
  }
});

// POST /api/product/screenshot/save
router.post('/screenshot/save', authenticateToken, async (req: any, res) => {
  const { session_id, screenshot_base64 } = req.body;
  if (!session_id || !screenshot_base64) {
    return res.status(400).json({ error: 'Missing session_id or screenshot_base64' });
  }
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(
      `UPDATE mvp_builds SET screenshot_url = ? WHERE session_id = ?`,
      [screenshot_base64, session_id]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to save screenshot:', err);
    res.status(500).json({ error: 'Failed to save screenshot' });
  }
});

export default router;
