const intervalMinutes = Number(process.env.SCHEDULER_INTERVAL_MIN || 15);
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const configuredSecret = process.env.CRON_SECRET;

if (!Number.isFinite(intervalMinutes) || intervalMinutes < 1) {
  throw new Error('SCHEDULER_INTERVAL_MIN doit être un nombre positif.');
}
if (!configuredSecret) {
  throw new Error('CRON_SECRET doit être configuré pour démarrer le planificateur.');
}
const cronSecret: string = configuredSecret;

async function runScheduler() {
  while (true) {
    try {
      const response = await fetch(new URL('/api/cron', appUrl), {
        method: 'POST',
        headers: { 'x-cron-secret': cronSecret },
      });
      if (!response.ok) {
        console.error(`[Scheduler] L’endpoint cron a répondu ${response.status}.`);
      } else {
        console.info('[Scheduler] Traitement des rappels et de la file terminé.');
      }
    } catch (error) {
      console.error('[Scheduler] Impossible d’exécuter le traitement planifié.', error);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMinutes * 60_000));
  }
}

void runScheduler();
