import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import jobsRoutes from './routes/jobs.routes';
import applicationsRoutes from './routes/applications.routes';
import employersRoutes from './routes/employers.routes';
import candidatesRoutes from './routes/candidates.routes';
import { initScheduler } from './services/cron';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/employers', employersRoutes);
app.use('/api/candidates', candidatesRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to JobMatch API' });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      message: 'Database operation failed',
      error: err.message
    });
    return;
  }

  if (err.name === 'PrismaClientValidationError') {
    res.status(400).json({
      message: 'Invalid data provided',
      error: err.message
    });
    return;
  }

  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  initScheduler();
}); 