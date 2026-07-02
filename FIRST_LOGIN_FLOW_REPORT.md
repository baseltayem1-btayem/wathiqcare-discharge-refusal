# Production First-Login Flow Investigation Report

## Summary

The **first-login page is missing from production**. The login API correctly detects a user who must change their password and the login UI redirects to `/first-login`, but that Next.js route was deleted during the App Router migration and was never restored under the new `src/app` directory. As a result, users with temporary or forced-reset credentials hit a **404 / not-found** after authenticating.

## Findings

### 1. Login API behavior
- **File:** `apps/web/src/app/api/auth/password/login/route.ts`
- The API does **not** issue an HTTP redirect.
- It computes `mustChangePassword` at line 271:
  ```ts
  const mustChangePassword = !userData?.lastPasswordChangedAt || resetState.passwordResetRequired;
  ```
- When `mustChangePassword` is true, the success response body includes `mustChangePassword: true` (lines 585–593) and the session cookie is still set.

### 2. Login page redirect
- **File:** `apps/web/src/app/login/page.tsx`
- Lines 135–138 read the API response and perform a **client-side** redirect:
  ```ts
  if (result.mustChangePassword) {
    router.push("/first-login");
    return;
  }
  ```
- This is the exact production route users are sent to after login.

### 3. The `/first-login` route does not exist
- `apps/web/src/app/first-login/` → **missing**
- `apps/web/src/app/reset-password/` → **missing**
- `apps/web/src/app/api/auth/change-password/` → **missing**
- Current `.next/server/app` build output also contains no `first-login` segment.
- Prior build logs (`apps/web/build_output.txt`, `docs/production-readiness/*.txt`) show `/first-login` only because they were produced before the route was removed.

### 4. When was it lost?
- Git history shows the original implementation was added in commit `b8db362e`:
  - `apps/web/app/first-login/page.tsx`
  - `apps/web/app/api/auth/change-password/route.ts`
- Both files were deleted in commit `9f72e55c` ("fix: restore approved forms api under src app router") and **were never recreated under `apps/web/src/app/`**.

### 5. Existing expectations
- `apps/web/module-access.spec.ts` still expects the first-login flow:
  - Waits for URL matching `/(first-login|modules|platform)/` (line 113).
  - Fills `#new-password` and `#confirm-password` (lines 123–124).
  - Clicks a button matching `/set new password|update password|تحديث كلمة المرور/i` (line 125).

## Required Fix

Restore the missing route and its backing API under the current App Router structure.

### Files to recreate

1. **First-login page**
   - Path: `apps/web/src/app/first-login/page.tsx`
   - Behavior:
     - Require an authenticated session (the login API already sets the cookie before redirecting).
     - Render a form with `id="new-password"` and `id="confirm-password"` fields.
     - POST the new password to `/api/auth/change-password`.
     - On success, redirect to the appropriate post-login destination (use `normalizePostLoginDestination` from `apps/web/src/app/login/page.tsx` or simply `/modules` to match current role-based landing behavior). The old implementation hard-coded `/dashboard`, which is no longer the correct target.

2. **Change-password API**
   - Path: `apps/web/src/app/api/auth/change-password/route.ts`
   - Behavior:
     - Authenticate the request with `requireAuth`.
     - Validate and hash the new password.
     - Update the user record:
       ```sql
       SET hashed_password = <hash>,
           auth_provider = 'local_password',
           last_password_changed_at = NOW(),
           password_reset_required = FALSE,
           failed_login_attempts = 0,
           locked_until = NULL
       ```
     - Return `{ ok: true }`.

### Optional hardening

- Add a middleware or root-layout guard that forces users with `password_reset_required` or `lastPasswordChangedAt == null` to `/first-login` before they can access `/modules`, `/platform`, etc.
- Ensure `/api/auth/change-password` is excluded from the `passwordResetRequired` 403 check so a user can actually submit the new password.

## Conclusion

The production first-login route is **`/first-login`**, and it is currently **missing**. The login API is working as intended; the missing piece is the UI route and the self-service change-password API. Recreating `apps/web/src/app/first-login/page.tsx` and `apps/web/src/app/api/auth/change-password/route.ts` will close the gap.
