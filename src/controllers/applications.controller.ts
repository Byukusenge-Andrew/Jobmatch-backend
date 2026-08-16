import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ApplicationStatus } from '@prisma/client';

export class ApplicationsController {
  static async applyJob(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { jobId, resume, coverLetter } = req.body;

      if (!jobId || !resume) {
        res.status(400).json({ message: 'jobId and resume are required' });
        return;
      }

      const existing = await prisma.jobApplication.findFirst({
        where: { jobId, userId: req.user.id }
      });

      if (existing) {
        res.status(400).json({ message: 'You have already applied for this job' });
        return;
      }

      const application = await prisma.jobApplication.create({
        data: {
          jobId,
          userId: req.user.id,
          resume,
          coverLetter,
          status: ApplicationStatus.PENDING
        },
        include: {
          job: true
        }
      });

      res.status(201).json({ message: 'Application submitted successfully', application });
    } catch (error) {
      console.error('Apply job error:', error);
      res.status(500).json({ message: 'Error submitting application' });
    }
  }

  static async getUserApplications(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const applications = await prisma.jobApplication.findMany({
        where: { userId: req.user.id },
        include: {
          job: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(applications);
    } catch (error) {
      console.error('Get user applications error:', error);
      res.status(500).json({ message: 'Error fetching applications' });
    }
  }

  static async getJobApplications(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { jobId } = req.params;

      const applications = await prisma.jobApplication.findMany({
        where: { jobId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(applications);
    } catch (error) {
      console.error('Get job applications error:', error);
      res.status(500).json({ message: 'Error fetching job applications' });
    }
  }

  static async updateApplicationStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(ApplicationStatus).includes(status as ApplicationStatus)) {
        res.status(400).json({ message: 'Invalid application status' });
        return;
      }

      const application = await prisma.jobApplication.update({
        where: { id },
        data: { status: status as ApplicationStatus },
        include: { job: true, user: true }
      });

      res.json({ message: 'Application status updated', application });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({ message: 'Error updating application status' });
    }
  }
}
