# Testing Guide

This repo currently has:

- a backend smoke test at `backend/scripts/smoke-http.js`
- a frontend production build check with Vite
- role-based routes in the frontend and backend
- no Jest, Vitest, Cypress, or Playwright test suite configured yet

## Quick Start

1. Start the backend:

```powershell
cd c:\TalentX\backend
cmd /c npm start
```

2. Start the frontend in another terminal:

```powershell
cd c:\TalentX\frontend
cmd /c npm run dev
```

3. Run the backend smoke test in another terminal:

```powershell
cd c:\TalentX\backend
cmd /c npm run smoke
```

4. Run a frontend build check:

```powershell
cd c:\TalentX\frontend
cmd /c npm run build
```

If PowerShell blocks `npm.ps1`, either keep using `cmd /c npm ...` or run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## Automation Testing

Yes. The project can already do basic automation testing at the API level with the smoke suite in `backend/scripts/smoke-http.js`.

It supports two automation styles:

- provide JWT tokens directly
- provide email and password for each role and let the script log in automatically

## Smoke Test Tokens

The smoke script can test read-only endpoints for each role if you provide tokens.

Windows PowerShell example:

```powershell
$env:SMOKE_BASE_URL = "http://localhost:5000"
$env:SMOKE_STUDENT_TOKEN = "your-student-jwt"
$env:SMOKE_RECRUITER_TOKEN = "your-recruiter-jwt"
$env:SMOKE_INTERVIEWER_TOKEN = "your-interviewer-jwt"
$env:SMOKE_ADMIN_TOKEN = "your-admin-jwt"
cd c:\TalentX\backend
cmd /c npm run smoke
```

Notes:

- `SMOKE_TOKEN` still works as a fallback for the student role.
- The script always checks `/api/health`.
- Without tokens, it still verifies that protected routes return `401`.
- With tokens, it also verifies that the role can reach its own endpoints and gets `403` on a few blocked routes.
- Some student endpoints accept `200` or `404` because a valid student login may still be missing a completed student profile.

## Smoke Test With Auto Login

If you do not want to copy tokens manually, use test account credentials instead.

Windows PowerShell example:

```powershell
$env:SMOKE_BASE_URL = "http://localhost:5000"
$env:SMOKE_STUDENT_EMAIL = "student@example.com"
$env:SMOKE_STUDENT_PASSWORD = "Student@123"
$env:SMOKE_RECRUITER_EMAIL = "recruiter@example.com"
$env:SMOKE_RECRUITER_PASSWORD = "Recruiter@123"
$env:SMOKE_INTERVIEWER_EMAIL = "interviewer@example.com"
$env:SMOKE_INTERVIEWER_PASSWORD = "Interviewer@123"
$env:SMOKE_ADMIN_EMAIL = "admin@example.com"
$env:SMOKE_ADMIN_PASSWORD = "Admin@123"
cd c:\TalentX\backend
cmd /c npm run smoke
```

What this automates:

- logs in for each role you configured
- gets the JWT automatically
- tests role-specific read-only endpoints
- confirms some forbidden routes still return `403`

Best practice:

- keep 1 stable test account for each role in your database
- use these only for testing
- avoid using production accounts for smoke automation

## Frontend Routes To Verify

Public routes from `frontend/src/App.jsx`:

- `/`
- `/about`
- `/register`
- `/forgot-password`

Student routes:

- `/student`
- `/student/dashboard`
- `/student/jobs`
- `/student/profile`
- `/student/interviews`
- `/student/assessments`
- `/student/applications`
- `/student/support`
- `/student/faq`
- `/student/interviews/:applicationId/room`

Recruiter routes:

- `/recruiter`
- `/recruiter/dashboard`
- `/recruiter/jobs`
- `/recruiter/applications`
- `/recruiter/support`

Interviewer routes:

- `/interviewer/reset-password`
- `/interviewer`
- `/interviewer/panel`
- `/interviewer/interviews/:applicationId/room`

Admin routes:

- `/admin`
- `/admin/support`

## Backend Route Groups To Verify

Mounted in `backend/server.js`:

- `/api/health`
- `/api/auth`
- `/api/student`
- `/api/company`
- `/api/application`
- `/api/jobs`
- `/api/admin`
- `/api/recruiter`
- `/api/interviewer`
- `/api/support`
- `/api/offer`
- `/api/notifications`
- `/api/export`
- `/api/bulk`

## Manual Feature Checklist

Run these flows after the backend and frontend are both up.

Student:

- Register and log in as a student.
- Create or update the student profile.
- Open jobs, recommendations, assessments, interviews, applications, support, and FAQ pages.
- Apply to a job.
- Verify the application appears in `My Applications`.
- Verify notifications load.

Recruiter:

- Log in as a recruiter.
- Create a company if needed.
- Create a job.
- Verify jobs list and recruiter dashboard stats.
- Open recruiter applications and shortlist or reject a candidate.
- Send an assessment or schedule an interview.
- Verify recruiter support loads.

Interviewer:

- Log in as an interviewer.
- If forced, reset the password.
- Open the interviewer panel.
- Verify assigned interviews load.
- Open an interview room for a scheduled application.
- Submit feedback or end an interview.

Admin:

- Log in as an admin.
- Verify users, jobs, stats, selected candidates, pending recruiters, and support data.
- Review a pending recruiter.
- Verify export endpoints respond.

## Best Overall Testing Order

1. `cmd /c npm run smoke` in `backend` for fast API guard checks.
2. `cmd /c npm run build` in `frontend` for compile-time issues.
3. Manual role-by-role testing in the browser for real features.
4. Fix any failures, then repeat smoke plus the affected manual flow.

## What Is Still Missing

If you want full confidence that "all routes, endpoints, and features" work every time, the next step is to add:

- backend integration tests for controllers and auth flows
- frontend component tests for critical pages
- end-to-end browser tests for student, recruiter, interviewer, and admin flows

The best stack for this repo would be:

- `supertest` for Express API tests
- `vitest` plus React Testing Library for frontend tests
- `playwright` for full end-to-end route and feature coverage
