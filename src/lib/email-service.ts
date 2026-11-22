import { prisma } from '@/lib/prisma';
import { ensureMongoIndex } from '@/lib/mongo';

export type EmailTemplate =
  | 'welcome'
  | 'task-assigned'
  | 'due-soon'
  | 'task-overdue'
  | 'team-added'
  | 'team-member-added'
  | 'training-enrollment'
  | 'coaching-request'
  | 'coaching-confirmed'
  | 'weekly-summary';

let fingerprintIndex: Promise<void> | undefined;

async function ensureFingerprintIndex() {
  if (!fingerprintIndex) {
    fingerprintIndex = ensureMongoIndex(
      'emailQueue',
      { fingerprint: 1 },
      { unique: true, partialFilterExpression: { fingerprint: { $type: 'string' } } }
    );
  }
  await fingerprintIndex;
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderEmail(template: EmailTemplate, data: Record<string, unknown>) {
  const titles: Record<EmailTemplate, string> = {
    welcome: 'Bienvenue sur StudyFlow',
    'task-assigned': 'Une tâche vous a été assignée',
    'due-soon': 'Échéance dans moins de 24 heures',
    'task-overdue': 'Tâche en retard',
    'team-added': 'Vous avez été ajouté à une équipe',
    'team-member-added': 'Un nouveau membre a rejoint l’équipe',
    'training-enrollment': 'Inscription confirmée',
    'coaching-request': 'Demande de coaching',
    'coaching-confirmed': 'Coaching confirmé',
    'weekly-summary': 'Résumé hebdomadaire StudyFlow',
  };
  const title = titles[template];
  const rawMessage = typeof data.message === 'string'
    ? data.message
    : typeof data.taskTitle === 'string'
      ? `Tâche : ${String(data.taskTitle)}`
      : typeof data.teamName === 'string'
        ? `Équipe : ${String(data.teamName)}`
        : 'Votre activité StudyFlow est disponible.';
  const message = escapeHtml(rawMessage).replace(/\r?\n/g, '<br>');
  const text = `${title}\n\n${rawMessage}`;
  const html = `<!doctype html><html><body><h1>${escapeHtml(title)}</h1><p>${message}</p></body></html>`;
  return { title, text, html };
}

export async function enqueueEmail(
  recipient: string,
  template: EmailTemplate,
  data: Record<string, unknown>,
  fingerprint?: string
) {
  if (!recipient || !recipient.includes('@')) throw new Error('Destinataire invalide.');

  if (fingerprint) {
    await ensureFingerprintIndex();
    const existing = await prisma.emailQueue.findFirst({ where: { fingerprint } });
    if (existing) return existing;
  }

  const rendered = renderEmail(template, data);
  try {
    return await prisma.emailQueue.create({
      data: {
        recipient,
        template,
        data,
        fingerprint: fingerprint || null,
        status: 'PENDING',
        attempts: 0,
        lastError: null,
        nextAttemptAt: new Date(),
        subject: rendered.title,
        text: rendered.text,
        html: rendered.html,
      },
    });
  } catch (error) {
    if (!fingerprint || !error || typeof error !== 'object' || !('code' in error) || error.code !== 11000) {
      throw error;
    }
    const existing = await prisma.emailQueue.findFirst({ where: { fingerprint } });
    if (existing) return existing;
    throw error;
  }
}

export async function processEmailQueue(limit = 20, emailId?: string) {
  const enabled = process.env.MAIL_ENABLED === 'true' || process.env.SMTP_ENABLED === 'true';
  if (!enabled) {
    const queued = await prisma.emailQueue.findMany({
      where: emailId ? { id: emailId, status: 'PENDING' } : { status: 'PENDING' },
      take: limit,
    });
    console.info(`[Email] SMTP désactivé; ${queued.length} message(s) en attente (contenu non journalisé).`);
    return { processed: 0, mode: 'logged' as const };
  }

  let nodemailer: typeof import('nodemailer');
  try {
    nodemailer = await import('nodemailer');
  } catch {
    return { processed: 0, mode: 'dependency-missing' as const };
  }

  const smtpOptions = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 1025),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD }
      : undefined,
  };
  const transport = process.env.SMTP_HOST
    ? nodemailer.createTransport(smtpOptions)
    : process.env.EMAIL_SERVER
      ? nodemailer.createTransport(process.env.EMAIL_SERVER)
      : nodemailer.createTransport(smtpOptions);
  const now = new Date();
  const pending = await prisma.emailQueue.findMany({
    where: {
      ...(emailId ? { id: emailId } : {}),
      status: 'PENDING',
      nextAttemptAt: { lte: now },
    },
    take: limit,
  });
  let processed = 0;

  for (const email of pending) {
    try {
      await transport.sendMail({
        from: process.env.EMAIL_FROM || process.env.MAIL_FROM || 'studyflow@localhost',
        to: email.recipient,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: 'SENT', sentAt: new Date(), lastError: null },
      });
    } catch (error) {
      const attempts = Number(email.attempts || 0) + 1;
      const delayMinutes = Math.min(60, 5 * 2 ** Math.max(0, attempts - 1));
      const next = new Date(Date.now() + delayMinutes * 60_000);
      const message = error instanceof Error ? error.message : '';
      const code =
        error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
          ? error.code
          : '';
      const masked = /auth/i.test(message) || /EAUTH/i.test(code)
        ? 'SMTP authentication failed.'
        : /timeout|ECONNECTION|ECONNREFUSED|ECONNRESET|ESOCKET|ENOTFOUND|EHOSTUNREACH/i.test(
            `${message} ${code}`
          )
          ? 'SMTP connection failed.'
          : 'SMTP delivery failed.';
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: attempts >= 5 ? 'FAILED' : 'PENDING',
          attempts,
          lastError: masked.slice(0, 500),
          nextAttemptAt: next,
        },
      });
    }
    processed++;
  }
  return { processed, mode: 'smtp' as const };
}
