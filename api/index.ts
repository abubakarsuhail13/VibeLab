import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// MySQL Connection Pool (Hostinger)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

let pool: any = null;

// Initialize pool and test connection
const getPool = async () => {
  if (!pool) {
    if (!process.env.DB_HOST) {
      console.warn('DB_HOST not configured. Database features will be simulated or fail.');
      return null;
    }
    try {
      pool = mysql.createPool(dbConfig);
      const connection = await pool.getConnection();
      console.log('Successfully connected to MySQL database');
      connection.release();
    } catch (err: any) {
      console.error('CRITICAL: Failed to connect to MySQL database:', {
        message: err.message,
        code: err.code,
        host: dbConfig.host,
        user: dbConfig.user
      });
      pool = null;
      return null;
    }
  }
  return pool;
};

// API Routes

app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ 
      error: 'Database connection failed', 
      debug: 'Check DB_HOST and Hostinger Remote MySQL settings' 
    });
    
    await p.execute(
      'INSERT INTO waitlist (email, source) VALUES (?, ?)',
      [email, 'vibelab_landing_v1']
    );
    res.json({ success: true, message: 'Successfully joined waitlist' });
  } catch (error: any) {
    console.error('Waitlist DB Error:', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, organization, role, interest_type, message, source } = req.body;
  if (!name || !email || !role || !message) return res.status(400).json({ error: 'Required fields missing' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ 
      error: 'Database connection failed',
      debug: 'Check DB_HOST and Hostinger Remote MySQL settings'
    });

    await p.execute(
      'INSERT INTO contact_submissions (name, email, organization, role, interest_type, message, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, organization, role, interest_type, message, source || 'vibelab_landing_v1']
    );
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error: any) {
    console.error('Contact DB Error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/admin/data', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  // Using '0000' as fallback password as requested
  const secureKey = process.env.VITE_ADMIN_PASSWORD || '0000';
  
  if (adminKey !== secureKey) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database not connected' });
    const [waitlist] = await p.execute('SELECT * FROM waitlist ORDER BY created_at DESC');
    const [submissions] = await p.execute('SELECT * FROM contact_submissions ORDER BY created_at DESC');
    res.json({ waitlist, submissions });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/health', async (req, res) => {
  const p = await getPool();
  res.json({ 
    status: 'ok', 
    db: !!p, 
    env_check: {
      has_host: !!process.env.DB_HOST,
      has_user: !!process.env.DB_USER
    }
  });
});

export default app;
