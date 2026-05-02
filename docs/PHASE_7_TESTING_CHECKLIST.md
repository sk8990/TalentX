# Phase 7 Testing Checklist

This checklist is for manual testing of the TalentX system after Phase 7 hardening.

## Student End-to-End Flow

### Open Student
- [ ] Signup as Open Student
- [ ] Login and see Open Student banner
- [ ] See only off-campus jobs
- [ ] Apply to allowed jobs
- [ ] Hit monthly application limit (5)
- [ ] Start AI interview until limit (2)
- [ ] See locked premium cards
- [ ] Cannot access offer letter/onboarding directly

### College Student
- [ ] Signup as College Student with correct college domain
- [ ] Status becomes pending
- [ ] Login and see pending banner
- [ ] Pending student sees only off-campus jobs
- [ ] College Admin approves student
- [ ] Student becomes approved/full access
- [ ] Student sees college-only jobs for own college
- [ ] Student can apply to college-only jobs
- [ ] Student has full access if Enterprise plan active

### Rejected College Student
- [ ] Rejected student sees rejected banner
- [ ] Rejected student behaves like limited student

## Recruiter End-to-End Flow

- [ ] Recruiter signup
- [ ] Recruiter status = pending
- [ ] Pending recruiter cannot post jobs
- [ ] Super Admin approves recruiter
- [ ] Approved recruiter can post jobs
- [ ] Recruiter can select one college
- [ ] Recruiter can select multiple colleges
- [ ] Recruiter can enable Off Campus visibility
- [ ] Recruiter cannot create job with no college and off-campus unchecked
- [ ] Recruiter can manage only own jobs
- [ ] Recruiter can view applicants only for own jobs

## College Admin End-to-End Flow

- [ ] Super Admin creates College Admin
- [ ] College Admin logs in
- [ ] College Admin sees own college profile
- [ ] College Admin sees pending students from own college only
- [ ] College Admin approves own college student
- [ ] College Admin rejects own college student
- [ ] College Admin cannot see other college students
- [ ] College Admin cannot approve recruiters
- [ ] College Admin sees jobs targeting own college only

## Super Admin End-to-End Flow

- [ ] Super Admin can create college
- [ ] Super Admin can edit college
- [ ] Super Admin can disable college
- [ ] Super Admin can create college admin
- [ ] Super Admin can approve recruiter
- [ ] Super Admin can reject recruiter
- [ ] Super Admin can suspend recruiter
- [ ] Super Admin can view college/recruiter status
- [ ] Super Admin pages are blocked for non-super_admin users

## Security Checks

### Backend
- [ ] Password hashes are never returned
- [ ] Student cannot set accessLevel manually
- [ ] Student cannot set collegeVerificationStatus manually
- [ ] Recruiter cannot set isRecruiterApproved manually
- [ ] Recruiter cannot set recruiterApprovalStatus manually
- [ ] College Admin cannot access another college's students
- [ ] Student cannot see hidden college-only jobs through direct URL
- [ ] Student cannot apply to hidden jobs through direct API call
- [ ] Limited student cannot access offer letter/onboarding through direct URL
- [ ] Recruiter cannot edit/delete another recruiter's job
- [ ] Recruiter cannot see another recruiter's applicants
- [ ] Public APIs expose only safe fields
- [ ] College domain is normalized before saving
- [ ] Email is normalized before saving

### Frontend
- [ ] Student dashboard accessible only by student
- [ ] Recruiter dashboard accessible only by recruiter
- [ ] College Admin dashboard accessible only by college_admin
- [ ] Super Admin dashboard accessible only by super_admin
- [ ] Pending recruiter sees pending approval screen
- [ ] Rejected recruiter sees rejection screen
- [ ] Suspended recruiter sees suspended screen
- [ ] Unauthorized users redirected to login or correct dashboard

## API Checks

- [ ] ObjectIds are validated before querying
- [ ] Duplicate email errors handled cleanly
- [ ] Duplicate college domain errors handled cleanly
- [ ] Invalid college selection returns proper message
- [ ] Invalid recruiter status returns proper message
- [ ] Unauthorized access returns 403 with clear message
- [ ] Missing resources return 404
- [ ] Server errors do not expose stack traces in production

## Database Indexes

- [ ] College: domain unique, status, enterprisePlanActive
- [ ] User: email unique, role, collegeId, recruiterApprovalStatus, isRecruiterApproved, isActive
- [ ] Job: recruiterId, targetColleges, visibleToOffCampus, visibilityType, status, createdAt
- [ ] Application: studentId, jobId, status, createdAt, unique compound on studentId+jobId
- [ ] StudentUsage: userId, month, unique compound on userId+month

## Deployment Checks

- [ ] Backend starts without crashing
- [ ] Frontend builds successfully
- [ ] No hardcoded localhost URL remains in production logic
- [ ] API base URL is configurable
- [ ] CORS settings are safe
- [ ] Environment variables documented in .env.example

## UI Consistency

- [ ] Tables have loading states
- [ ] Empty states are clear
- [ ] Error states are clear
- [ ] Success toasts/messages work
- [ ] Buttons are disabled while submitting
- [ ] Forms validate required fields
- [ ] Status badges use consistent labels
- [ ] Long college names do not break layout
- [ ] Job visibility badges are readable
- [ ] Access cards are understandable

## Backward Compatibility

- [ ] Old students (missing new fields) behave as limited
- [ ] Old recruiters (missing approval fields) have pending status
- [ ] Old jobs (missing visibility fields) do not crash listing
- [ ] Old college admins (missing collegeId) show clear message

## Migration Script

- [ ] Migration script runs without errors
- [ ] Migration logs all changes
- [ ] Migration does not delete data
- [ ] Migration handles edge cases

## Notes

- Run migration script: `node backend/scripts/migratePhase7.js`
- Test in development environment first
- Check logs for any errors during migration
- Verify database indexes are created after migration
