import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { JobType, JobStatus } from '@prisma/client';
import { JobScraperService } from '../services/jobScraper.service';

export class JobsController {
  static async searchJobs(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        location,
        page = '1',
        limit = '10',
        jobType,
        experience,
        salary,
        companySize,
        sortBy = 'recent'
      } = req.query;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const skip = (pageNum - 1) * limitNum;

      const whereClause: any = {
        status: JobStatus.ACTIVE
      };

      if (query && typeof query === 'string' && query.trim() !== '') {
        const q = query.trim();
        whereClause.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { companyName: { contains: q, mode: 'insensitive' } }
        ];
      }

      if (location && typeof location === 'string' && location.trim() !== '') {
        whereClause.location = { contains: location.trim(), mode: 'insensitive' };
      }

      if (jobType && typeof jobType === 'string') {
        const types = jobType.split(',').map(t => t.trim().toUpperCase());
        whereClause.type = { in: types.filter(t => Object.values(JobType).includes(t as JobType)) };
      }

      if (experience && typeof experience === 'string') {
        const expList = experience.split(',').map(e => e.trim());
        whereClause.OR = whereClause.OR || [];
        expList.forEach(exp => {
          whereClause.OR.push({ experience: { contains: exp, mode: 'insensitive' } });
        });
      }

      let orderBy: any = { postedDate: 'desc' };
      if (sortBy === 'recent') {
        orderBy = { postedDate: 'desc' };
      }

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where: whereClause,
          skip,
          take: limitNum,
          orderBy
        }),
        prisma.job.count({ where: whereClause })
      ]);

      const filters = {
        jobTypes: [
          { value: 'FULL_TIME', count: await prisma.job.count({ where: { ...whereClause, type: JobType.FULL_TIME } }) },
          { value: 'PART_TIME', count: await prisma.job.count({ where: { ...whereClause, type: JobType.PART_TIME } }) },
          { value: 'CONTRACT', count: await prisma.job.count({ where: { ...whereClause, type: JobType.CONTRACT } }) },
          { value: 'FREELANCE', count: await prisma.job.count({ where: { ...whereClause, type: JobType.FREELANCE } }) }
        ],
        experienceLevels: [
          { value: 'Entry Level', count: 12 },
          { value: 'Mid Level', count: 24 },
          { value: 'Senior Level', count: 18 }
        ],
        salaryRanges: [
          { value: '$50k - $80k', count: 8 },
          { value: '$80k - $120k', count: 20 },
          { value: '$120k+', count: 15 }
        ],
        companySizes: [
          { value: '1-50 employees', count: 10 },
          { value: '50-200 employees', count: 18 },
          { value: '200+ employees', count: 14 }
        ]
      };

      const formattedJobs = jobs.map(j => ({
        ...j,
        requirements: j.requirements ? j.requirements.split(';') : [],
        responsibilities: j.responsibilities ? j.responsibilities.split(';') : [],
        benefits: [
          { icon: 'health_and_safety', title: 'Health Insurance', description: 'Comprehensive medical cover' },
          { icon: 'schedule', title: 'Flexible Working', description: 'Work remotely or in office' },
          { icon: 'paid', title: 'Competitive Salary', description: 'Includes performance bonuses' }
        ]
      }));

      res.json({
        jobs: formattedJobs,
        total,
        filters
      });
    } catch (error) {
      console.error('Search jobs error:', error);
      res.status(500).json({ message: 'Error searching jobs' });
    }
  }

  static async getPopularSearches(req: Request, res: Response): Promise<void> {
    try {
      res.json([
        { id: 1, term: 'Full Stack Developer', count: 142 },
        { id: 2, term: 'Angular Specialist', count: 98 },
        { id: 3, term: 'Node.js Backend', count: 87 },
        { id: 4, term: 'Remote UI/UX Designer', count: 75 },
        { id: 5, term: 'Data Engineer', count: 63 }
      ]);
    } catch (error) {
      res.status(500).json({ message: 'Error getting popular searches' });
    }
  }

  static async getJobById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const job = await prisma.job.findUnique({
        where: { id },
        include: { employer: { select: { id: true, name: true, email: true } } }
      });

      if (!job) {
        res.status(404).json({ message: 'Job not found' });
        return;
      }

      const formattedJob = {
        ...job,
        requirements: job.requirements ? job.requirements.split(';') : [],
        responsibilities: job.responsibilities ? job.responsibilities.split(';') : [],
        benefits: [
          { icon: 'health_and_safety', title: 'Health Insurance', description: 'Comprehensive medical cover' },
          { icon: 'schedule', title: 'Flexible Working', description: 'Work remotely or in office' },
          { icon: 'paid', title: 'Competitive Salary', description: 'Includes performance bonuses' }
        ]
      };

      res.json(formattedJob);
    } catch (error) {
      console.error('Get job by id error:', error);
      res.status(500).json({ message: 'Error fetching job details' });
    }
  }

  static async createJob(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || (req.user.role !== 'EMPLOYER' && req.user.role !== 'ADMIN')) {
        res.status(403).json({ message: 'Only employers can post jobs' });
        return;
      }

      const {
        title,
        description,
        requirements,
        responsibilities,
        location,
        type,
        category,
        salary,
        experience,
        companyName,
        companyLogo,
        companyWebsite,
        companySize
      } = req.body;

      const job = await prisma.job.create({
        data: {
          title,
          description,
          requirements: Array.isArray(requirements) ? requirements.join(';') : (requirements || ''),
          responsibilities: Array.isArray(responsibilities) ? responsibilities.join(';') : (responsibilities || ''),
          location,
          type: type || JobType.FULL_TIME,
          category: category || 'General',
          salary: salary || 'Negotiable',
          experience: experience || 'Mid Level',
          companyName: companyName || req.user.name,
          companyLogo: companyLogo || 'https://picsum.photos/200/200',
          companyWebsite,
          companySize,
          employerId: req.user.id
        }
      });

      res.status(201).json({ message: 'Job posted successfully', job });
    } catch (error) {
      console.error('Create job error:', error);
      res.status(500).json({ message: 'Error creating job' });
    }
  }

  static async saveJob(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      const { id } = req.params;

      const existing = await prisma.savedJob.findFirst({
        where: { jobId: id, userId: req.user.id }
      });

      if (!existing) {
        await prisma.savedJob.create({
          data: {
            jobId: id,
            userId: req.user.id
          }
        });
      }

      res.json({ message: 'Job saved successfully' });
    } catch (error) {
      console.error('Save job error:', error);
      res.status(500).json({ message: 'Error saving job' });
    }
  }

  static async unsaveJob(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      const { id } = req.params;

      await prisma.savedJob.deleteMany({
        where: { jobId: id, userId: req.user.id }
      });

      res.json({ message: 'Job unsaved successfully' });
    } catch (error) {
      console.error('Unsave job error:', error);
      res.status(500).json({ message: 'Error unsaving job' });
    }
  }

  static async getSavedJobs(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const saved = await prisma.savedJob.findMany({
        where: { userId: req.user.id },
        include: { job: true }
      });

      const jobs = saved.map(s => ({
        ...s.job,
        requirements: s.job.requirements ? s.job.requirements.split(';') : [],
        responsibilities: s.job.responsibilities ? s.job.responsibilities.split(';') : [],
        saved: true
      }));

      res.json(jobs);
    } catch (error) {
      console.error('Get saved jobs error:', error);
      res.status(500).json({ message: 'Error fetching saved jobs' });
    }
  }

  static async scrapeJobs(req: Request, res: Response): Promise<void> {
    try {
      const result = await JobScraperService.scrapeAndSyncJobs();
      res.json({
        message: 'Job scraping & 30-day cleanup completed successfully',
        data: result
      });
    } catch (error) {
      console.error('Scrape jobs error:', error);
      res.status(500).json({ message: 'Error running job scraper' });
    }
  }
}
