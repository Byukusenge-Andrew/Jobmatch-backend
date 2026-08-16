import axios from 'axios';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { Role, JobType, JobStatus } from '@prisma/client';

export class JobScraperService {
  /**
   * Ensure default Admin user and Scraper Bot user exist in DB
   */
  static async ensureAdminAndBotUser() {
    // 1. Inbuilt Admin User
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@jobmatch.com' }
    });

    if (!adminUser) {
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: 'admin@jobmatch.com',
          password: hashedAdminPassword,
          name: 'JobMatch Admin',
          role: Role.ADMIN,
          isVerified: true
        }
      });
      console.log('[ScraperService] Inbuilt Admin user created (admin@jobmatch.com / admin123)');
    }

    // 2. Scraper Bot User
    let botUser = await prisma.user.findUnique({
      where: { email: 'job.bot@jobmatch.com' }
    });

    if (!botUser) {
      const hashedBotPassword = await bcrypt.hash('botpassword123', 10);
      botUser = await prisma.user.create({
        data: {
          email: 'job.bot@jobmatch.com',
          password: hashedBotPassword,
          name: 'Global Job Crawler Bot',
          role: Role.EMPLOYER,
          isVerified: true
        }
      });
      console.log('[ScraperService] Global Job Crawler Bot created.');
    }

    return botUser;
  }

  /**
   * Delete or close jobs posted more than 30 days ago
   */
  static async cleanOldJobs(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await prisma.job.deleteMany({
      where: {
        postedDate: {
          lt: thirtyDaysAgo
        }
      }
    });

    console.log(`[JobCleaner] Removed ${deleted.count} jobs older than 30 days (posted before ${thirtyDaysAgo.toISOString().split('T')[0]})`);
    return deleted.count;
  }

  /**
   * Fetch real jobs from external internet APIs and store in PostgreSQL
   */
  static async scrapeAndSyncJobs() {
    console.log('[ScraperService] Starting internet job scraping & 30-day cleanup...');
    const botUser = await this.ensureAdminAndBotUser();
    const cleanedCount = await this.cleanOldJobs();

    let insertedCount = 0;
    let fetchedCount = 0;

    // 1. Fetch from Arbeitnow Job Board API
    try {
      console.log('[ScraperService] Fetching from Arbeitnow API...');
      const response = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
        headers: { 'User-Agent': 'JobMatchScraper/1.0' },
        timeout: 10000
      });

      if (response.data && Array.isArray(response.data.data)) {
        const jobs = response.data.data;
        fetchedCount += jobs.length;

        for (const rawJob of jobs) {
          if (!rawJob.title || !rawJob.url) continue;

          // Check if already exists
          const existing = await prisma.job.findFirst({
            where: {
              OR: [
                { jobUrl: rawJob.url },
                { title: rawJob.title, companyName: rawJob.company_name || 'Tech Company' }
              ]
            }
          });

          if (!existing) {
            // Strip HTML tags from description if present
            const cleanDescription = (rawJob.description || 'No description provided.')
              .replace(/<[^>]*>?/gm, '')
              .substring(0, 2000);

            const tagsStr = Array.isArray(rawJob.tags) ? rawJob.tags.join(', ') : 'Tech';

            await prisma.job.create({
              data: {
                title: rawJob.title,
                description: cleanDescription,
                requirements: `Key skills: ${tagsStr}; Direct application link provided; Remote or local on-site opportunity.`,
                responsibilities: `Deliver high-quality results for ${rawJob.company_name}; Collaborate with engineering teams; Participate in code reviews.`,
                location: rawJob.location || (rawJob.remote ? 'Remote' : 'Various Locations'),
                type: rawJob.remote ? JobType.FULL_TIME : JobType.FULL_TIME,
                category: rawJob.tags?.[0] || 'Software Engineering',
                salary: '$80,000 - $130,000',
                experience: 'Mid-Senior Level',
                companyName: rawJob.company_name || 'Tech Company',
                companyLogo: `https://picsum.photos/id/${1020 + (insertedCount % 30)}/200/200`,
                companyWebsite: rawJob.url,
                companySize: '50-500 employees',
                jobUrl: rawJob.url,
                isExternal: true,
                featured: insertedCount % 3 === 0,
                status: JobStatus.ACTIVE,
                postedDate: rawJob.created_at ? new Date(rawJob.created_at * 1000) : new Date(),
                employerId: botUser.id
              }
            });

            insertedCount++;
          }
        }
      }
    } catch (err: any) {
      console.error('[ScraperService] Error fetching from Arbeitnow API:', err.message);
    }

    // 2. Fetch from RemoteOK API
    try {
      console.log('[ScraperService] Fetching from RemoteOK API...');
      const response = await axios.get('https://remoteok.com/api', {
        headers: { 'User-Agent': 'JobMatchScraper/1.0' },
        timeout: 10000
      });

      if (Array.isArray(response.data)) {
        // Skip first metadata element
        const jobs = response.data.slice(1);
        fetchedCount += jobs.length;

        for (const rawJob of jobs.slice(0, 25)) {
          if (!rawJob.position || !rawJob.url) continue;

          const existing = await prisma.job.findFirst({
            where: {
              OR: [
                { jobUrl: rawJob.url },
                { title: rawJob.position, companyName: rawJob.company || 'Remote Employer' }
              ]
            }
          });

          if (!existing) {
            const cleanDescription = (rawJob.description || 'Remote tech position available.')
              .replace(/<[^>]*>?/gm, '')
              .substring(0, 2000);

            const tagsStr = Array.isArray(rawJob.tags) ? rawJob.tags.join(', ') : 'Remote';
            const salary = (rawJob.salary_min && rawJob.salary_max)
              ? `$${Math.round(rawJob.salary_min / 1000)}k - $${Math.round(rawJob.salary_max / 1000)}k`
              : '$90,000 - $140,000';

            await prisma.job.create({
              data: {
                title: rawJob.position,
                description: cleanDescription,
                requirements: `Skills: ${tagsStr}; Strong communication; Remote working setup required.`,
                responsibilities: `Develop software features; Communicate asynchronously; High self-motivation.`,
                location: rawJob.location || 'Remote Worldwide',
                type: JobType.FULL_TIME,
                category: rawJob.tags?.[0] || 'Software Engineering',
                salary: salary,
                experience: 'Mid-Senior Level',
                companyName: rawJob.company || 'Remote Employer',
                companyLogo: rawJob.company_logo || `https://picsum.photos/id/${1050 + (insertedCount % 30)}/200/200`,
                companyWebsite: rawJob.url,
                companySize: '20-200 employees',
                jobUrl: rawJob.url,
                isExternal: true,
                featured: true,
                status: JobStatus.ACTIVE,
                postedDate: rawJob.date ? new Date(rawJob.date) : new Date(),
                employerId: botUser.id
              }
            });

            insertedCount++;
          }
        }
      }
    } catch (err: any) {
      console.error('[ScraperService] Error fetching from RemoteOK API:', err.message);
    }

    console.log(`[ScraperService] Finished! Total fetched: ${fetchedCount}, New jobs added: ${insertedCount}, Deleted old (>30 days): ${cleanedCount}`);

    return {
      fetchedCount,
      insertedCount,
      cleanedCount
    };
  }
}
