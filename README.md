
## Registration

The login page now includes **Create Requester Account**.

- Public registration creates only the `requester` role.
- Administrator and Facility Staff accounts should be created/managed by the administrator.
- Live registration requires Supabase credentials in `js/config.js`.
- If Supabase email confirmation is enabled, the user must confirm their email before logging in.
- The SQL schema includes a policy allowing a newly authenticated user to create only their own Requester profile.

# Role-Based Facility Reservation and Approval System

Laboratory 4 - Section B  
Systems Analysis and Design

## Technology
- HTML
- CSS
- JavaScript
- Supabase
- GitHub Pages

## Run immediately
1. Extract this ZIP.
2. Open `index.html` in a browser.
3. Choose a Demo Account.
4. Demo password for the normal login form is `password`.
5. Test Requester, Facility Staff, and Administrator workflows.

The demo mode uses browser localStorage, so no server is required for classroom testing.

## Use Supabase
1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Create Auth users for the three roles.
5. Put each user's UUID in the `profiles` table with:
   - admin
   - staff
   - requester
6. Copy the Supabase Project URL and anon key into `js/config.js`.
7. Deploy the folder to GitHub.
8. Enable GitHub Pages.

## Demo accounts
- admin@example.com / password
- staff@example.com / password
- requester@example.com / password

## Required workflow
Requester:
Pending -> cancel eligible Pending request

Administrator:
Pending -> Scheduled (approval) OR Rejected

Facility Staff:
Scheduled -> In Use -> Completed

## Business rules implemented in demo
- Only Active facilities can be reserved.
- Maintenance facilities are blocked.
- Start must be before End.
- Approved/Scheduled/In Use overlapping schedules are blocked.
- Only Administrator can approve/reject.
- Rejected reservations cannot be scheduled through the interface.
- Completed reservations cannot be edited.
- Requester can cancel only their own Pending request.
- Critical actions are recorded in the audit log.
- Facility deletion is blocked if it has active reservations.
