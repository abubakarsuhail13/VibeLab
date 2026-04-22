import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // MySQL Connection Pool (Hostinger)
  // We use a pool for efficiency and stability
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  let pool: any = null;

  // Initialize pool lazily to avoid crashing if DB is not ready
  const getPool = () => {
    if (!pool) {
      if (!process.env.DB_HOST) {
        console.warn('DB_HOST not configured. Database features will be simulated or fail.');
        return null;
      }
      pool = mysql.createPool(dbConfig);
    }
    return pool;
  };

  // API Routes
  
  // Waitlist Submission
  app.post('/api/waitlist', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    console.log(`Waitlist submission: ${email}`);

    try {
      const p = getPool();
      if (p) {
        await p.execute(
          'INSERT INTO waitlist (email, source) VALUES (?, ?)',
          [email, 'vibelab_landing_v1']
        );
      }
      res.json({ success: true, message: 'Successfully joined waitlist' });
    } catch (error: any) {
      console.error('Waitlist DB Error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Contact Form Submission
  app.post('/api/contact', async (req, res) => {
    const { name, email, organization, role, interest_type, message, source } = req.body;
    
    if (!name || !email || !role || !message) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    console.log(`Contact submission from: ${email}`);

    try {
      const p = getPool();
      if (p) {
        await p.execute(
          'INSERT INTO contact_submissions (name, email, organization, role, interest_type, message, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [name, email, organization, role, interest_type, message, source || 'vibelab_landing_v1']
        );
      }
      res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
      console.error('Contact DB Error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Admin Data (Protected by simple key for now)
  app.get('/api/admin/data', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    
    // In production, use a more secure auth system or VITE_ADMIN_PASSWORD
    if (adminKey !== process.env.VITE_ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const p = getPool();
      if (!p) return res.status(503).json({ error: 'Database not connected' });

      const [waitlist] = await p.execute('SELECT * FROM waitlist ORDER BY created_at DESC');
      const [submissions] = await p.execute('SELECT * FROM contact_submissions ORDER BY created_at DESC');

      res.json({
        waitlist,
        submissions
      });
    } catch (error) {
      console.error('Admin Fetch Error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', db: !!getPool() });
  });

  // Vite Middleware for Dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VibeLab Full-Stack Server running at http://localhost:${PORT}`);
  });
}

startServer();
