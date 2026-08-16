import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export class EmployersController {
  static async getEmployers(req: Request, res: Response): Promise<void> {
    try {
      const employers = await prisma.user.findMany({
        where: { role: 'EMPLOYER' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          jobs: {
            select: {
              id: true,
              title: true,
              location: true,
              type: true,
              category: true,
              salary: true
            }
          }
        }
      });

      const formatted = employers.map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
        logo: 'https://picsum.photos/200/200',
        industry: 'Technology & Software',
        location: 'San Francisco, CA',
        openPositions: e.jobs.length,
        description: 'Leading provider of innovative software solutions and digital platforms.',
        jobs: e.jobs
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Get employers error:', error);
      res.status(500).json({ message: 'Error fetching employers' });
    }
  }

  static async getEmployerById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const employer = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          jobs: true
        }
      });

      if (!employer || employer.role !== 'EMPLOYER') {
        res.status(404).json({ message: 'Employer not found' });
        return;
      }

      res.json({
        id: employer.id,
        name: employer.name,
        email: employer.email,
        logo: 'https://picsum.photos/200/200',
        industry: 'Technology & Software',
        location: 'San Francisco, CA',
        website: 'https://techcorp.example.com',
        size: '100-500 employees',
        description: 'Leading technology software company delivering scalable web solutions.',
        jobs: employer.jobs
      });
    } catch (error) {
      console.error('Get employer details error:', error);
      res.status(500).json({ message: 'Error fetching employer details' });
    }
  }
}
