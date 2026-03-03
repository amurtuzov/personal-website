import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import url from 'url';
import { renderContactEmailHtml } from './templates/contactEmail';

type ContactEmailJobData = {
  name: string;
  email: string;
  message: string;
  subject?: string;
  ip?: string;
  userAgent?: string;
  createdAtIso: string;
};

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
const redisPassword = process.env.REDIS_PASSWORD;

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
const smtpSecure = (process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const contactTo = process.env.CONTACT_TO;
const contactFrom = process.env.CONTACT_FROM || smtpUser;
const subjectPrefix = process.env.CONTACT_SUBJECT_PREFIX || '[Contact Form]';

if (!smtpUser || !smtpPass || !contactTo || !contactFrom) {
  console.error(
    'Missing required email config: SMTP_USER, SMTP_PASS, CONTACT_TO (and CONTACT_FROM or SMTP_USER)'
  );
  process.exit(1);
}

function parseRedisConnection() {
  if (redisUrl) {
    try {
      const parsed = new url.URL(redisUrl);
      return {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        password: parsed.password || redisPassword,
      };
    } catch {
      console.warn('Invalid REDIS_URL, falling back to REDIS_HOST/PORT');
    }
  }
  return {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
  };
}

const redisConn = parseRedisConnection();
const workerConnection = {
  host: redisConn.host,
  port: redisConn.port,
  password: redisConn.password,
};

const transport = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

async function sendContactEmail(data: ContactEmailJobData) {
  const safeSubject = (data.subject || '').trim();
  const subject = safeSubject ? `${subjectPrefix} ${safeSubject}` : subjectPrefix;

  const text = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    data.ip ? `IP: ${data.ip}` : undefined,
    data.userAgent ? `User-Agent: ${data.userAgent}` : undefined,
    `At: ${data.createdAtIso}`,
    '',
    data.message,
  ]
    .filter(Boolean)
    .join('\n');

  let html: string | undefined;
  try {
    html = renderContactEmailHtml({
      subject,
      name: data.name,
      email: data.email,
      message: data.message,
      ip: data.ip,
      userAgent: data.userAgent,
      createdAtIso: data.createdAtIso,
    });
  } catch (e) {
    console.error('Failed to render MJML email, falling back to text-only.', e);
  }

  await transport.sendMail({
    to: contactTo,
    from: contactFrom,
    replyTo: data.email,
    subject,
    text,
    html,
  });
}

const worker = new Worker(
  'emailQueue',
  async (job: Job<ContactEmailJobData>) => {
    if (job.name !== 'sendContactEmail') return;
    await sendContactEmail(job.data);
  },
  {
    connection: workerConnection,
    concurrency: 2,
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Email job completed id=${job.id} name=${job.name}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Email job failed id=${job?.id} name=${job?.name}`, err);
});

worker.on('error', (err) => {
  console.error('Email worker error', err);
});

const shutdown = async () => {
  console.log('Shutting down email worker...');
  try {
    await worker.close();
    process.exit(0);
  } catch (e) {
    console.error('Error during shutdown', e);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(
  `Email worker started — redis=${workerConnection.host}:${workerConnection.port} smtp=${smtpHost}:${smtpPort} secure=${smtpSecure}`
);
