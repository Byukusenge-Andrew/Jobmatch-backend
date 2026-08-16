import { Router, Request, Response, NextFunction } from 'express';
import { ApplicationsController } from '../controllers/applications.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ApplicationsController.applyJob(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/user', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ApplicationsController.getUserApplications(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/job/:jobId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ApplicationsController.getJobApplications(req, res);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ApplicationsController.updateApplicationStatus(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
