# JobMatch Backend API

A robust Node.js, Express, TypeScript, and Prisma ORM RESTful API powering the **JobMatch** platform. Features real-time job searching, automated internet job scraping, 30-day scheduled job pruning, role-based access control (Candidates, Employers, Admins), and PostgreSQL database integration.

---

## 🚀 Features

- **Authentication & Security**: JWT-based authentication, password hashing with `bcryptjs`, and role-based middleware (`CANDIDATE`, `EMPLOYER`, `ADMIN`).
- **Inbuilt Admin Account**: Pre-seeded admin user configurable via environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- **Automated Internet Job Scraper**: Integrated `JobScraperService` that fetches live tech/remote jobs from free public APIs (Arbeitnow & RemoteOK).
- **30-Day Job Retention**: Automated `node-cron` background task (running every 6 hours) that prunes or closes jobs older than 30 days (`postedDate < 30 days ago`).
- **Job Search & Filtering**: Multi-criteria search (keyword, location, job type, experience level, salary range) with pagination and sorting.
- **Application Workflow**: Candidates can apply internally or click direct links for scraped external jobs. Employers can track and update applicant status.
- **Saved Jobs**: Candidate bookmarking and saved job management.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js (v5)
- **Language**: TypeScript
- **Database ORM**: Prisma ORM
- **Database**: PostgreSQL
- **Background Tasks**: `node-cron`
- **HTTP Client**: `axios`
- **Authentication**: `jsonwebtoken`, `bcryptjs`

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
DATABASE_URL="postgres://username:password@host:port/database?sslmode=require"
JWT_SECRET="your_jwt_secret_key_here"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"

# Optional Inbuilt Admin Configuration
ADMIN_EMAIL="admin@jobmatch.com"
ADMIN_PASSWORD="admin123"
USER_PASSWORD="password123"
```

---

## 📥 Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Sync Database Schema**:
   ```bash
   npm run db:push
   ```

3. **Seed Database** (Populates Admin user, demo employers, candidates, and sample jobs):
   ```bash
   npm run db:seed
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 🌱 Seed Script Structure (`prisma/seed.ts`)

The database seed script (`prisma/seed.ts`) executes when running `npm run db:seed`. It initializes test data and systemic accounts:

1. **Environment Configuration**:
   - Loads `.env` variables using `dotenv.config()`.
   - Reads `ADMIN_EMAIL` (default: `admin@jobmatch.com`), `ADMIN_PASSWORD` (default: `admin123`), and `USER_PASSWORD` (default: `password123`).

2. **Cascade Cleanup**:
   - Safely deletes existing records in relational order to prevent foreign key conflicts:
     ```ts
     await prisma.jobApplication.deleteMany();
     await prisma.savedJob.deleteMany();
     await prisma.job.deleteMany();
     await prisma.user.deleteMany();
     ```

3. **Inbuilt Admin User Creation**:
   - Creates the default system Admin account (`Role.ADMIN`):
     ```ts
     await prisma.user.create({
       data: {
         email: process.env.ADMIN_EMAIL || 'admin@jobmatch.com',
         password: hashedAdminPassword,
         name: 'JobMatch Admin',
         role: Role.ADMIN,
         isVerified: true
       }
     });
     ```

4. **Employer & Candidate Users Creation**:
   - **Employers**: `employer@techcorp.com` (`TechCorp Solutions`), `recruiter@cloudscale.io` (`CloudScale Tech`).
   - **Candidates**: `john.doe@gmail.com` (`John Doe`), `jane.smith@gmail.com` (`Jane Smith`).

5. **Initial Jobs Data**:
   - Populates realistic featured jobs across key categories:
     - *Software Engineering* (Senior Full Stack Developer)
     - *Frontend Development* (Frontend Angular Specialist)
     - *Backend Development* (Backend Node.js & Cloud Engineer)
     - *Design & UX* (UI/UX Product Designer)
     - *Data & AI* (Data Scientist & AI Specialist)

6. **Applications & Saved Jobs**:
   - Creates sample candidate job applications (`PENDING`, `SHORTLISTED`) with cover letters and resume URLs.
   - Creates initial candidate saved jobs (`SavedJob`).

---

## 📡 API Endpoints Overview

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new Candidate or Employer user.
- `POST /api/auth/login` — Authenticate and receive JWT token.
- `GET  /api/auth/me` — Get current logged-in user profile (*Requires Token*).

### 💼 Jobs (`/api/jobs`)
- `GET    /api/jobs/search` — Search jobs (Query parameters: `query`, `location`, `jobType`, `experience`, `salary`, `page`, `limit`, `sortBy`).
- `GET    /api/jobs/popular-searches` — Fetch top search tags.
- `GET    /api/jobs/saved` — Get candidate's bookmarked jobs (*Requires Token*).
- `GET    /api/jobs/:id` — Get job details by ID.
- `POST   /api/jobs` — Create a job posting (*Employers & Admins only*).
- `POST   /api/jobs/:id/save` — Bookmark a job (*Requires Token*).
- `DELETE /api/jobs/:id/save` — Unsave a job (*Requires Token*).
- `POST   /api/jobs/scrape` — Trigger manual job scraping & 30-day cleanup.

### 📝 Applications (`/api/applications`)
- `POST   /api/applications` — Submit a job application (*Requires Token*).
- `GET    /api/applications/user` — Get applications submitted by current candidate (*Requires Token*).
- `GET    /api/applications/job/:jobId` — Get applicants for a job posting (*Requires Token*).
- `PATCH  /api/applications/:id/status` — Update application status (`PENDING`, `REVIEWING`, `SHORTLISTED`, `REJECTED`, `ACCEPTED`).

### 🏢 Employers & Candidates (`/api/employers`, `/api/candidates`)
- `GET /api/employers` & `GET /api/employers/:id` — Fetch registered employers and company details.
- `GET /api/candidates` & `GET /api/candidates/:id` — Fetch candidates directory and profiles.

---

## ⏰ Automated Cron Scheduler

The backend initializes an automated background scheduler (`src/services/cron.ts`) upon server startup:
- **Interval**: Every 6 hours (`0 */6 * * *`)
- **Task**: Runs `JobScraperService.scrapeAndSyncJobs()` which:
  1. Deletes jobs posted >30 days ago.
  2. Fetches fresh tech jobs from Arbeitnow and RemoteOK APIs.
  3. Deduplicates and inserts new external postings with direct application links (`jobUrl`).