import { Router, Request, Response, NextFunction } from 'express';
import { CandidatesController } from '../controllers/candidates.controller';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await CandidatesController.getCandidates(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await CandidatesController.getCandidateById(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
