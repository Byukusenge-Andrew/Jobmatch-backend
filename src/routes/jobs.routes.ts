import { Router, Request, Response, NextFunction } from 'express';
import { JobsController } from '../controllers/jobs.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await JobsController.searchJobs(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/popular-searches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await JobsController.getPopularSearches(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/saved', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await JobsController.getSavedJobs(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/scrape', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await JobsController.scrapeJobs(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await JobsController.getJobById(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await JobsController.createJob(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/save', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await JobsController.saveJob(req, res);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/save', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await JobsController.unsaveJob(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
