import cron from 'node-cron';
import { runDueSchedules } from '../modules/scheduled-reports/scheduled-reports.service';

export function startScheduledReportsJob() {
  // Todos los días a las 8am: envía los reportes programados cuyo día coincide con hoy.
  cron.schedule('0 8 * * *', async () => {
    try {
      const sent = await runDueSchedules();
      if (sent > 0) console.log(`[ScheduledReports] ${sent} reporte(s) enviado(s)`);
    } catch (err) {
      console.error('[ScheduledReports cron error]', err);
    }
  });

  console.log('[Jobs] Scheduled reports cron scheduled (daily at 8am)');
}
