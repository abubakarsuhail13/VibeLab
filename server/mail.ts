import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
const emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.hostinger.com';
const emailPort = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587');
const isSecure = (process.env.EMAIL_PORT || process.env.SMTP_PORT || '587') === '465';

const transporterOptions: any = {
  host: emailHost,
  port: emailPort,
  secure: isSecure,
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
};

if (emailUser && emailPass) {
  transporterOptions.auth = {
    user: emailUser,
    pass: emailPass,
  };
} else {
  console.log('Email Debug: Credentials not configured, utilizing simulated email flow.');
}

export const transporter = nodemailer.createTransport(transporterOptions);

// Lazy-loaded Resend helper
let resendClient: any = null;
const getResendClient = () => {
  if (!resendClient && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = require('resend'); // lazy require to prevent static failures if any
      resendClient = new Resend(process.env.RESEND_API_KEY);
    } catch (e) {
      // Dynamic import standard for ESM
      import('resend').then((m) => {
        resendClient = new m.Resend(process.env.RESEND_API_KEY);
      }).catch(() => {});
    }
  }
  return resendClient;
};

export const sendMail = async (options: nodemailer.SendMailOptions) => {
  try {
    const toEmail = Array.isArray(options.to) ? options.to[0] : options.to;
    if (!toEmail) return null;

    console.log(`Email Debug: Preparing to send email to ${toEmail}`);

    // Try Resend first if API key is present
    if (process.env.RESEND_API_KEY) {
      try {
        const apiKey = process.env.RESEND_API_KEY;
        const { Resend } = await import('resend');
        const resendInstance = new Resend(apiKey);
        const fromEmail = process.env.EMAIL_USER || "onboarding@resend.dev";
        const emailFrom = fromEmail.includes('@') ? fromEmail : "VibeLab <onboarding@resend.dev>";

        console.log(`Email Debug (Resend): Sending to ${toEmail} from ${emailFrom}`);
        const data = await resendInstance.emails.send({
          from: emailFrom,
          to: [toEmail as string],
          subject: (options.subject || '') as string,
          html: (options.html || '') as string
        });
        console.log('Email SUCCESS (Resend):', data);
        return data;
      } catch (resendError: any) {
        console.error('Email Fallback trigger (Resend failed):', resendError.message);
      }
    }

    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
    if (!user || !pass) {
      console.log('Email Info: Running in simulated email mode. No custom SMTP or Resend credentials detected.');
      console.log(`[EMAIL SIMULATION] To: ${toEmail}\nSubject: ${options.subject}\nBody: ${options.html}`);
      return { messageId: 'simulated-id' };
    }
    
    console.log(`Email Debug (SMTP): Attempting mail from ${user} to ${toEmail}`);

    const info = await transporter.sendMail({
      from: `"VibeLab" <${user}>`,
      ...options,
    });
    console.log('Email SUCCESS (SMTP): %s', info.messageId);
    return info;
  } catch (error: any) {
    console.error('Email FAILURE:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    return null;
  }
};
