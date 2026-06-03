import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cryptoRandomString from 'crypto-random-string';
import fs from 'fs';
import { getPool } from '../db.js';
import { sendMail } from '../mail.js';
import { JWT_SECRET } from '../auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password, role, account_type, country } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  // Determine role from account_type if specified
  let finalRole = role || 'student';
  if (account_type) {
    if (account_type.toLowerCase().includes('teacher')) {
      finalRole = 'teacher';
    } else {
      finalRole = 'student';
    }
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [existing]: any = await p.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = cryptoRandomString({ length: 32, type: 'url-safe' });

    // Generate permanent VL-ID
    const year = new Date().getFullYear();
    const [countRes]: any = await p.execute(
      'SELECT COUNT(*) as total FROM users WHERE YEAR(created_at) = ?',
      [year]
    );
    const nextVal = (countRes[0].total + 1).toString().padStart(5, '0');
    let vlId = `VL-${year}-${nextVal}`;

    let counter = 1;
    while (true) {
      const [checkRes]: any = await p.execute('SELECT id FROM users WHERE vl_id = ?', [vlId]);
      if (checkRes.length === 0) break;
      vlId = `VL-${year}-${(countRes[0].total + 1 + counter).toString().padStart(5, '0')}`;
      counter++;
    }

    const [result]: any = await p.execute(
      'INSERT INTO users (name, email, password, role, verification_token, vl_id, account_type, country, profile_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
      [name, email, hashedPassword, finalRole, verificationToken, vlId, account_type || null, country || 'Worldwide']
    );

    const userId = result.insertId;

    try {
      const [firstPhase]: any = await p.execute('SELECT id FROM phases ORDER BY order_index ASC LIMIT 1');
      if (firstPhase.length > 0) {
        await p.execute(
          'INSERT IGNORE INTO user_phase_progress (user_id, phase_id, status) VALUES (?, ?, "active")',
          [userId, firstPhase[0].id]
        );
      }
    } catch (onboardingErr) {
      console.error('Onboarding Error:', onboardingErr);
    }
    
    const baseUrl = process.env.VITE_APP_URL || 'https://vibe-lab-tan.vercel.app';
    await sendMail({
      to: email,
      subject: 'Verify your VibeLab Account',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h1 style="color: #0ea5e9;">Welcome to VibeLab, ${name}!</h1>
          <p>Your permanent Student ID is: <strong style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${vlId}</strong></p>
          <p>Please verify your email address to activate your account and start your learning journey.</p>
          <a href="${baseUrl}/verify-email?token=${verificationToken}" 
             style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">
            Verify Email Address
          </a>
          <p style="font-size: 12px; color: #64748b;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    try {
      fs.appendFileSync('server-error.log', `[${new Date().toISOString()}] Registration Error: ${error.stack || error.message || error}\n`);
    } catch (e) {}
    res.status(500).json({ error: `Database error during registration: ${error.message || error}` });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email address before logging in.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        vl_id: user.vl_id,
        account_type: user.account_type,
        country: user.country,
        profile_completed: !!user.profile_completed
      }
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Database error during login' });
  }
});

router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token missing' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute('SELECT id FROM users WHERE verification_token = ?', [token]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired verification token' });

    const user = rows[0];
    await p.execute('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?', [user.id]);

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute('SELECT id, name FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
    }

    const user = rows[0];
    const resetToken = cryptoRandomString({ length: 32, type: 'url-safe' });
    const expires = new Date(Date.now() + 3600000); 

    await p.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, expires, user.id]
    );

    const baseUrl = process.env.VITE_APP_URL || 'https://vibe-lab-tan.vercel.app';
    await sendMail({
      to: email,
      subject: 'Reset your VibeLab Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h1>Password Reset Request</h1>
          <p>Hi ${user.name}, we received a request to reset your password.</p>
          <p>Click the link below to set a new password (valid for 1 hour):</p>
          <a href="${baseUrl}/reset-password?token=${resetToken}" 
             style="display: inline-block; background: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">
            Reset Password
          </a>
          <p>If you didn't request this, you can ignore this email.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Reset link sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: 'Forgot password failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const user = rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await p.execute(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ success: true, message: 'Password reset successful! You can now log in with your new password.' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// GitHub OAuth Redirect Endpoint
router.get('/github', (req: any, res) => {
  const client_id = process.env.GITHUB_CLIENT_ID;
  if (!client_id) {
    return res.status(500).json({ error: 'GitHub OAuth is not configured in the workspace.' });
  }
  const baseUrl = process.env.VITE_APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirect_uri = `${baseUrl}/api/auth/github/callback`;
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=read:user,user:email`;
  res.redirect(githubUrl);
});

// GitHub OAuth Callback Endpoint
router.get('/github/callback', async (req: any, res) => {
  const { code } = req.query;
  const redirectBase = process.env.VITE_APP_URL || `${req.protocol}://${req.get('host')}`;
  
  if (!code) {
    return res.redirect(redirectBase + '/login?error=no_code_provided');
  }
  
  try {
    const client_id = process.env.GITHUB_CLIENT_ID;
    const client_secret = process.env.GITHUB_CLIENT_SECRET;
    const baseUrl = process.env.VITE_APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirect_uri = `${baseUrl}/api/auth/github/callback`;
    
    // 1. Exchange OAuth code for an access token
    const tokenUrl = 'https://github.com/login/oauth/access_token';
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
        redirect_uri
      })
    });
    
    const tokenData: any = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('[OAuth] Failed to retrieve access token:', tokenData);
      return res.redirect(redirectBase + '/login?error=token_failed');
    }
    
    const accessToken = tokenData.access_token;
    
    // 2. Query basic GitHub user parameters
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'VibeLab-App'
      }
    });
    const ghUser: any = await userRes.json();
    
    // 3. Query all registered github email lists
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'VibeLab-App'
      }
    });
    const ghEmails: any[] = await emailsRes.json();
    const primaryEmailObj = Array.isArray(ghEmails) ? (ghEmails.find((e: any) => e.primary) || ghEmails[0]) : null;
    const email = primaryEmailObj ? primaryEmailObj.email : `${ghUser.login}@github-vibelab.io`;
    
    if (!email) {
      return res.redirect(redirectBase + '/login?error=no_email_returned');
    }
    
    const p = await getPool();
    if (!p) {
      return res.redirect(redirectBase + '/login?error=db_failed');
    }
    
    // 4. Trace if user email is registered or if a new user registration is needed
    const [rows]: any = await p.execute('SELECT * FROM users WHERE email = ?', [email]);
    let user = null;
    
    if (rows.length > 0) {
      user = rows[0];
      // Sync github properties if empty or unlinked
      await p.execute(
        'UPDATE users SET github_handle = ?, github_url = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?',
        [ghUser.login, ghUser.html_url, ghUser.avatar_url || '', user.id]
      );
      // Fetch updated user to get vl_id and everything
      const [updatedRows]: any = await p.execute('SELECT * FROM users WHERE id = ?', [user.id]);
      user = updatedRows[0];
    } else {
      // Setup dynamic secure hash password for GitHub user accounts
      const { randomBytes } = await import('crypto');
      const randomPassword = randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      const year = new Date().getFullYear();
      const [countRes]: any = await p.execute(
        'SELECT COUNT(*) as total FROM users WHERE YEAR(created_at) = ?',
        [year]
      );
      const nextVal = (countRes[0].total + 1).toString().padStart(5, '0');
      let vlId = `VL-${year}-${nextVal}`;
      
      let counter = 1;
      while (true) {
        const [checkRes]: any = await p.execute('SELECT id FROM users WHERE vl_id = ?', [vlId]);
        if (checkRes.length === 0) break;
        vlId = `VL-${year}-${(countRes[0].total + 1 + counter).toString().padStart(5, '0')}`;
        counter++;
      }
      
      const [insertRes]: any = await p.execute(
        'INSERT INTO users (name, email, password, role, is_verified, github_handle, github_url, avatar_url, vl_id) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)',
        [ghUser.name || ghUser.login, email, hashedPassword, 'student', ghUser.login, ghUser.html_url, ghUser.avatar_url, vlId]
      );
      
      const newUserId = insertRes.insertId;
      try {
        const [firstPhase]: any = await p.execute('SELECT id FROM phases ORDER BY order_index ASC LIMIT 1');
        if (firstPhase.length > 0) {
          await p.execute(
            'INSERT IGNORE INTO user_phase_progress (user_id, phase_id, status) VALUES (?, ?, "active")',
            [newUserId, firstPhase[0].id]
          );
        }
      } catch (obErr) {
        console.error('Onboarding Error:', obErr);
      }
      
      const [userRow]: any = await p.execute('SELECT * FROM users WHERE id = ?', [newUserId]);
      user = userRow[0];
    }
    
    // 5. Generate validation JWT session
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      vl_id: user.vl_id
    };
    
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Completing Authentication...</title>
      </head>
      <body>
        <div style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #0f172a; color: #f8fafc;">
          <div style="text-align: center;">
            <svg style="animation: spin 1s linear infinite; margin: 0 auto 16px auto; width: 40px; height: 40px; color: #0284c7;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <style>
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            </style>
            <h2 style="font-weight: 600; margin-bottom: 8px; font-family: system-ui, sans-serif;">Authenticating...</h2>
            <p style="font-size: 14px; color: #94a3b8; font-family: system-ui, sans-serif;">Please wait while we log you in securely.</p>
          </div>
        </div>
        <script>
          try {
            const token = ${JSON.stringify(token)};
            const user = ${JSON.stringify(userPayload)};
            localStorage.setItem('vibelab_token', token);
            localStorage.setItem('vibelab_user', JSON.stringify(user));
            localStorage.setItem('vibelab_oauth_redirect', 'true');
            window.location.href = '/';
          } catch (e) {
            console.error('OAuth save failure:', e);
            window.location.href = '/login?error=auth_integration_failed';
          }
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error('[OAuth] Error in callback:', err);
    return res.redirect(process.env.VITE_APP_URL || (req ? `${req.protocol}://${req.get('host')}` : 'https://vibe-lab-tan.vercel.app') + '/login?error=callback_exception');
  }
});

// Google OAuth Redirect Endpoint
router.get('/google', (req: any, res) => {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  if (!client_id) {
    return res.status(500).json({ error: 'Google OAuth is not configured in the workspace.' });
  }
  const baseUrl = process.env.VITE_APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirect_uri = `${baseUrl}/api/auth/google/callback`;
  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&prompt=select_account`;
  res.redirect(googleUrl);
});

// Google OAuth Callback Endpoint
router.get('/google/callback', async (req: any, res) => {
  const { code } = req.query;
  const redirectBase = process.env.VITE_APP_URL || `${req.protocol}://${req.get('host')}`;
  if (!code) {
    return res.redirect(redirectBase + '/login?error=no_code_provided');
  }
  
  try {
    const client_id = process.env.GOOGLE_CLIENT_ID;
    const client_secret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = process.env.VITE_APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirect_uri = `${baseUrl}/api/auth/google/callback`;
    
    // 1. Exchange OAuth code for an access token
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: client_id || '',
        client_secret: client_secret || '',
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri
      })
    });
    
    const tokenData: any = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('[Google OAuth] Failed to retrieve access token:', tokenData);
      return res.redirect(redirectBase + '/login?error=token_failed');
    }
    
    const accessToken = tokenData.access_token;
    
    // 2. Query basic Google user details
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const gUser: any = await userRes.json();
    
    const email = gUser.email;
    if (!email) {
      return res.redirect(redirectBase + '/login?error=no_email_returned');
    }
    
    const p = await getPool();
    if (!p) {
      return res.redirect(redirectBase + '/login?error=db_failed');
    }
    
    // 3. Trace if user email is registered or if a new user registration is needed
    const [rows]: any = await p.execute('SELECT * FROM users WHERE email = ?', [email]);
    let user = null;
    
    if (rows.length > 0) {
      user = rows[0];
      // Sync Google avatar if empty and exists
      if (!user.avatar_url && gUser.picture) {
        await p.execute(
          'UPDATE users SET avatar_url = ? WHERE id = ?',
          [gUser.picture, user.id]
        );
        user.avatar_url = gUser.picture;
      }
    } else {
      // Setup dynamic secure hash password for Google user accounts
      const { randomBytes } = await import('crypto');
      const randomPassword = randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      const year = new Date().getFullYear();
      const [countRes]: any = await p.execute(
        'SELECT COUNT(*) as total FROM users WHERE YEAR(created_at) = ?',
        [year]
      );
      const nextVal = (countRes[0].total + 1).toString().padStart(5, '0');
      let vlId = `VL-${year}-${nextVal}`;
      
      let counter = 1;
      while (true) {
        const [checkRes]: any = await p.execute('SELECT id FROM users WHERE vl_id = ?', [vlId]);
        if (checkRes.length === 0) break;
        vlId = `VL-${year}-${(countRes[0].total + 1 + counter).toString().padStart(5, '0')}`;
        counter++;
      }
      
      const [insertRes]: any = await p.execute(
        'INSERT INTO users (name, email, password, role, is_verified, avatar_url, vl_id) VALUES (?, ?, ?, ?, 1, ?, ?)',
        [gUser.name || email.split('@')[0], email, hashedPassword, 'student', gUser.picture || '', vlId]
      );
      
      const newUserId = insertRes.insertId;
      try {
        const [firstPhase]: any = await p.execute('SELECT id FROM phases ORDER BY order_index ASC LIMIT 1');
        if (firstPhase.length > 0) {
          await p.execute(
            'INSERT IGNORE INTO user_phase_progress (user_id, phase_id, status) VALUES (?, ?, "active")',
            [newUserId, firstPhase[0].id]
          );
        }
      } catch (obErr) {
        console.error('Onboarding Error:', obErr);
      }
      
      const [userRow]: any = await p.execute('SELECT * FROM users WHERE id = ?', [newUserId]);
      user = userRow[0];
    }
    
    // 4. Generate validation JWT session
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      vl_id: user.vl_id
    };
    
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Completing Authentication...</title>
      </head>
      <body>
        <div style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #0f172a; color: #f8fafc;">
          <div style="text-align: center;">
            <svg style="animation: spin 1s linear infinite; margin: 0 auto 16px auto; width: 40px; height: 40px; color: #0284c7;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <style>
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            </style>
            <h2 style="font-weight: 600; margin-bottom: 8px; font-family: system-ui, sans-serif;">Authenticating...</h2>
            <p style="font-size: 14px; color: #94a3b8; font-family: system-ui, sans-serif;">Please wait while we log you in securely.</p>
          </div>
        </div>
        <script>
          try {
            const token = ${JSON.stringify(token)};
            const user = ${JSON.stringify(userPayload)};
            localStorage.setItem('vibelab_token', token);
            localStorage.setItem('vibelab_user', JSON.stringify(user));
            localStorage.setItem('vibelab_oauth_redirect', 'true');
            window.location.href = '/';
          } catch (e) {
            console.error('OAuth save failure:', e);
            window.location.href = '/login?error=auth_integration_failed';
          }
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error('[Google OAuth] Error in callback:', err);
    return res.redirect(redirectBase + '/login?error=callback_exception');
  }
});

export default router;
