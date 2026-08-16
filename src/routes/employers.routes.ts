import { Router, Request, Response, NextFunction } from 'express';
import { EmployersController } from '../controllers/employers.controller';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await EmployersController.getEmployers(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await EmployersController.getEmployerById(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
