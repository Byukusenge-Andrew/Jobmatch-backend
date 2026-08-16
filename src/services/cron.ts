import cron from 'node-cron';
import { JobScraperService } from './jobScraper.service';

export function initScheduler() {
  console.log('[Scheduler] Initializing automated job scraper & 30-day cleanup scheduler...');

  // Run scraper & 30-day cleanup immediately on server startup
  JobScraperService.scrapeAndSyncJobs().catch(err => {
    console.error('[Scheduler] Initial startup scraping failed:', err.message);
  });

  // Schedule cron job to run every 6 hours (at minute 0 of hour 0, 6, 12, 18)
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Scheduler] Executing scheduled 6-hour job scraping and 30-day cleanup...');
    try {
      await JobScraperService.scrapeAndSyncJobs();
    } catch (err: any) {
      console.error('[Scheduler] Scheduled scraping error:', err.message);
    }
  });

  console.log('[Scheduler] Cron schedule active: Running every 6 hours.');
}
