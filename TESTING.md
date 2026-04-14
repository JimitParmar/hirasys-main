# Testing Guide

## Test Accounts
All passwords: `Test1234!`

| Role | Email | What to test |
|------|-------|-------------|
| Admin | admin@acme.com | Team management, billing, audit logs, company settings |
| HR | hr@acme.com | Create jobs, build pipelines, review candidates |
| Candidate 1 | candidate1@test.com | Apply to jobs, take assessments, do AI interviews |
| Candidate 2 | candidate2@test.com | Apply and go through pipeline |

## Testing Flows

### Flow 1: Job Creation → Pipeline → Publish
1. Login as HR (hr@acme.com)
2. Create a new job with full details
3. Go to Pipeline Builder
4. Either drag-and-drop nodes OR use "AI Generate"
5. Link pipeline to job
6. Publish job

### Flow 2: Candidate Application
1. Login as Candidate (candidate1@test.com)
2. Browse jobs → Apply with resume upload
3. Wait for pipeline to process (check notifications)
4. Take coding/MCQ assessment when ready
5. Complete AI interview when prompted
6. Check application status

### Flow 3: HR Review
1. Login as HR
2. Go to job detail → see candidate cards
3. Click "View Details" on a candidate
4. Review resume score, assessment results, interview transcript
5. Move candidates between stages
6. Schedule F2F interview

### Flow 4: Team Management (Admin only)
1. Login as Admin
2. Go to Team page
3. Invite a new member (use a real email to test)
4. Change roles, deactivate/activate members
5. Check Audit Log for all actions

### Flow 5: Billing
1. Login as Admin
2. Go to Billing page
3. View usage breakdown
4. Try upgrading plan (use test card: 4111 1111 1111 1111)

## Bug Report Template
- **Page:** (e.g., /hr/jobs/create)
- **Steps:** What you did
- **Expected:** What should happen
- **Actual:** What actually happened
- **Screenshot:** If possible
- **Browser:** Chrome/Safari/Firefox
- **Device:** Desktop/Mobile