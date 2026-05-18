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
  console.warn('Email Debug: Credentials missing in environment variables.');
}

export const transporter = nodemailer.createTransport(transporterOptions);

export const sendMail = async (options: nodemailer.SendMailOptions) => {
  try {
    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
    if (!user || !pass) {
      console.warn('Email config ERROR: USER or PASS missing');
      return null;
    }
    
    console.log(`Email Debug: Attempting mail from ${user} to ${options.to}`);

    const info = await transporter.sendMail({
      from: `"VibeLab" <${user}>`,
      ...options,
    });
    console.log('Email SUCCESS: %s', info.messageId);
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
