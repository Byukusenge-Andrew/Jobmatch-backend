import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export class CandidatesController {
  static async getCandidates(req: Request, res: Response): Promise<void> {
    try {
      const candidates = await prisma.user.findMany({
        where: { role: 'CANDIDATE' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          applications: {
            select: { id: true }
          }
        }
      });

      const formatted = candidates.map((c, index) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        title: index % 2 === 0 ? 'Senior Full Stack Engineer' : 'Frontend Developer',
        location: index % 2 === 0 ? 'San Francisco, CA' : 'New York, NY',
        avatar: `https://picsum.photos/id/${1005 + index}/200/200`,
        skills: index % 2 === 0 ? ['Angular', 'TypeScript', 'Node.js', 'PostgreSQL'] : ['React', 'CSS3', 'HTML5', 'RxJS'],
        experience: '5 years',
        applicationsCount: c.applications.length
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Get candidates error:', error);
      res.status(500).json({ message: 'Error fetching candidates' });
    }
  }

  static async getCandidateById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const candidate = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      });

      if (!candidate) {
        res.status(404).json({ message: 'Candidate not found' });
        return;
      }

      res.json({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        title: 'Software Engineer',
        location: 'San Francisco, CA',
        avatar: 'https://picsum.photos/id/1005/200/200',
        skills: ['Angular', 'TypeScript', 'Node.js', 'PostgreSQL', 'Express'],
        experience: '5 years',
        bio: 'Passionate software engineer focused on building clean, testable, and user-centric web applications.'
      });
    } catch (error) {
      console.error('Get candidate by id error:', error);
      res.status(500).json({ message: 'Error fetching candidate' });
    }
  }
}
