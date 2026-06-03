import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPool } from '../server/db.js';
import router from '../server/routes/index.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Log requests
app.use((req, res, next) => {
  console.log(`Serverless API: ${req.method} ${req.url}`);
  next();
});

// Middleware to ensure DB is connected
app.use(async (req, res, next) => {
  const pool = await getPool();
  if (!pool) {
    return res.status(503).json({ error: 'Database connection failed' });
  }
  next();
});

// API Routes
app.use('/api', router);
app.use('/', router); // Also mount at root for Vercel functions compatibility

// Error Fallback
app.use((req, res) => {
  console.warn(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'API route not found', path: req.url });
});

export default app;
