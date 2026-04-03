# Platform Admin UI Isolation - ENFORCEMENT LAYERS

## ✅ Layer 1: UI Layer (Navigation Isolation)

### Problem Solved
- ❌ Was: Tenant menu items visible in AppShell even for platform admins
- ✅ Now: Platform admins ONLY see PlatformAdminShell with platform modules

### Implementation
**File: `src/components/PlatformAdminShell.tsx`**
- Dedicated sidebar for platform admins only
- Navigation items: Platform Overview, Tenant Management, Subscription Management, Billing, Health, Audit, Support, Settings
- Uses PlatformNotificationBell (no tenant API calls)
- Visual theme: Purple header stripe (vs cyan for tenant users)

**File: `src/components/AppShell.tsx`**
- NEVER shown to platform_admin users (protected by middleware)
- Remains unchanged for tenant users (employees, doctors, etc.)
- Contains complete tenant operational UI (cases, workflows, EMR, operations, etc.)

### Verification
```bash
# Tenant user sees AppShell (tenant operations UI)
Login as: tenant_admin@tenant.com → See /dashboard → 30+ menu items

# Platform admin sees PlatformAdminShell (SaaS management UI)
Login as: admin@wathiqcare.online → See /platform → 8 platform menu items only
```

---

## ✅ Layer 2: Route Layer (Access Control)

### Problem Solved
- ❌ Was: Platform admins could hypothetically access /dashboard, /cases, /operations routes
- ✅ Now: Middleware actively blocks and redirects platform admins away

### Implementation
**File: `middleware.ts`**

```typescript
const PLATFORM_BLOCKED_PREFIXES = [
  "/dashboard",    // Tenant dashboard
  "/cases",        // Tenant cases
  "/emr",          // Tenant EMR
  "/emr-integration",
  "/workflow",     // Tenant workflows
  "/operations",   // Tenant operations
  "/admin",        // Tenant admin (role management)
];

if (userType === "platform_admin") {
  if (pathname === "/login") {
    return NextResponse.redirect(PLATFORM_ONLY_HOME); // Redirect to /platform
  }
  
  if (isPlatformBlockedPath(pathname)) {
    return NextResponse.redirect(PLATFORM_ONLY_HOME); // Redirect to /platform
  }
}
```

### Protection
1. Platform admin at `/login` → redirected to `/platform`
2. Platform admin at `/dashboard` → redirected to `/platform`
3. Platform admin at `/cases` → redirected to `/platform`
4. Platform admin at `/operations` → redirected to `/platform`
5. Platform admin at `/admin` → redirected to `/platform`

### Verification
```bash
# Try direct URL access
curl -H "Cookie: wathiqcare_access_token=<platform_jwt>" https://wathiqcare.online/cases
→ Response: 302 Redirect to /platform

curl -H "Cookie: wathiqcare_access_token=<platform_jwt>" https://wathiqcare.online/operations
→ Response: 302 Redirect to /platform

curl -H "Cookie: wathiqcare_access_token=<platform_jwt>" https://wathiqcare.online/dashboard
→ Response: 302 Redirect to /platform
```

---

## ✅ Layer 3: API Layer (Data Access Control)

### Problem Solved
- ❌ Was: NotificationBell called `/api/operations/notifications` (tenant endpoint) from PlatformAdminShell
- ❌ Was: This endpoint requires `tenantId` from JWT, platform admin has no tenant_id
- ❌ Was: Resulted in repeated 500 errors in browser console
- ✅ Now: Platform routes ONLY call platform-level APIs, never tenant operations

### Implementation

**Component: `src/components/operations/NotificationBell.tsx`**
- NOW: Has guards to check user type before calling tenant API
- Detects if user is platform_admin and skips loading
- Gracefully handles 403 errors if endpoint rejects

```typescript
useEffect(() => {
  const checkAccess = async () => {
    try {
      const me = await apiFetch<{ userType?: string }>("/api/auth/me", { 
        cache: "no-store", 
        authFailureMode: "inline" 
      });
      if (me?.userType === "platform_admin") {
        setCanLoad(false);  // Skip tenant notifications for platform admins
        return;
      }
    } catch {
      // Continue anyway
    }
  };
  
  void checkAccess();
  // ... rest of effect
}, []);

async function loadNotifications() {
  if (!canLoad) return;  // Guard: don't call tenant API
  // ... load only if tenant user
}
```

**Component: `src/components/PlatformNotificationBell.tsx`** (NEW)
- Platform-only notification bell
- NO API calls to tenant operation endpoints
- Ready for future platform-level events system

**File: `app/platform/page.tsx` (Platform Overview)**
```
API calls made:
✅ /api/admin/setup/status        (platform level)
✅ /api/tenants?limit=100         (platform level - list all tenants)
✅ /api/billing/invoices?limit=30 (platform level)
✅ /api/subscription/summary      (platform level)

NONE of these require tenant_id context
NONE of these are operational endpoints
```

**File: `app/api/operations/notifications/route.ts`**
- Endpoint now protected by defensive auth checks:
```typescript
const auth = await requireAuth(request);
const tenantId = requireTenantId(auth);  // Throws 403 if no tenant_id
```

### Verification
```bash
# Platform admin makes request to tenant API
curl -X GET https://wathiqcare.online/api/operations/notifications?limit=20 \
  -H "Cookie: wathiqcare_access_token=<platform_jwt>"
→ Response: 403 Forbidden (tenantId required)

# Platform admin page loads (NO tenant API calls)
GET https://wathiqcare.online/platform
→ Network tab shows ONLY these APIs:
  ✅ /api/auth/me
  ✅ /api/admin/setup/status (200)
  ✅ /api/tenants (200)
  ✅ /api/billing/invoices (200)
  ✅ /api/subscription/summary (200)
  ❌ /api/operations/notifications (NOT CALLED)

# Browser console
→ No 500 errors
→ No failed requests
→ Clean operation
```

---

## 📋 Files Changed

### New Files
1. `src/components/PlatformAdminShell.tsx` - Platform admin dashboard layout
2. `src/components/PlatformNotificationBell.tsx` - Platform-level notifications (no tenant API)
3. `app/platform/layout.tsx` - Platform route layout with access guard
4. `app/platform/page.tsx` - Platform overview (rewritten, no tenant APIs)
5. `app/platform/tenants/page.tsx` - Tenant management (CRUD)
6. `app/platform/subscriptions/page.tsx` - Subscription list
7. `app/platform/billing/page.tsx` - Billing dashboard
8. `app/platform/health/page.tsx` - System health monitoring
9. `app/platform/audit/page.tsx` - Audit logs
10. `app/platform/support/page.tsx` - Support tools (read-only inspection)

### Modified Files
1. `src/components/AppShell.tsx` - **Unchanged** (used only by tenant users)
2. `src/components/operations/NotificationBell.tsx` - **Enhanced** with platform admin guard
3. `middleware.ts` - **Already had** PLATFORM_BLOCKED_PREFIXES protection

---

## 🛡️ Defense-in-Depth Summary

| Layer | Control | Status |
|-------|---------|--------|
| **Routing** | `/platform` only for platform_admin, other routes blocked | ✅ Middleware enforced |
| **UI** | PlatformAdminShell shows only 8 system modules | ✅ No tenant menu items |
| **API Selection** | Platform page calls only `/api/admin/*`, `/api/tenants/*`, `/api/billing/*`, `/api/subscription/*` | ✅ No operational endpoints |
| **Component Guards** | NotificationBell checks user type before calling tenant API | ✅ Guards prevent misuse |
| **Endpoint Auth** | All tenant APIs require valid `tenantId` from JWT | ✅ Returns 403 for platform admins |
| **Error Handling** | Frontend gracefully handles 403 from tenant endpoints | ✅ No console errors |

---

## 🧪 Test Cases

### Test 1: Platform Admin Cannot See Tenant Menu
```
Given: Platform admin logged in
When: Navigate to /platform
Then: See ONLY [Overview, Tenants, Subscriptions, Billing, Health, Audit, Support, Settings]
And: NOT see [Dashboard, Cases, Operations, EMR, Workflow, Compliance, etc.]
```

### Test 2: Platform Admin Redirected from Tenant Routes
```
Given: Platform admin with valid JWT
When: Direct URL to /dashboard, /cases, /operations
Then: Redirected to /platform (status 302)
And: URL bar shows /platform after redirect
```

### Test 3: Platform Page Loads Without Tenant API Calls
```
Given: Platform admin at /platform
When: Page loads
Then: Browser network tab shows:
  - /api/auth/me (200)
  - /api/admin/setup/status (200)
  - /api/tenants (200)
  - /api/billing/invoices (200)
  - /api/subscription/summary (200)
And: NO /api/operations/notifications call
And: NO 500 errors in console
```

### Test 4: Tenant Operations Reject Platform Admins
```
Given: Platform admin with valid JWT
When: Call /api/operations/notifications directly
Then: Response 403 Forbidden
And: Error message: "Tenant context is required"
```

### Test 5: Tenant User Still Has Full Access
```
Given: Tenant user (employee) logged in
When: Navigate to /dashboard
Then: See full AppShell with all tenant operations
And: NotificationBell works and loads tenant notifications
And: Can access /cases, /operations, /workflow, etc.
```

---

## 🚀 Deployment Checklist

- [x] PlatformAdminShell created with platform-only navigation
- [x] PlatformNotificationBell created (no tenant API calls)
- [x] NotificationBell guarded to skip tenant API for platform admins
- [x] Platform layout validates user type on mount
- [x] Platform page.tsx updated to use PlatformAdminShell
- [x] All platform subpages created (tenants, subscriptions, billing, health, audit, support)
- [x] Middleware already blocks platform admins from tenant routes
- [x] API layer already rejects platform admins from tenant operations
- [x] Removed imports of AppShell from platform pages
- [x] Removed imports of tenant NotificationBell from PlatformAdminShell

---

## 📊 Expected Production State

### API Call Patterns

**Platform Admin User:**
```
GET /api/auth/me
  → Response: { userType: "platform_admin", platform_role: "platform_admin", tenant_id: null }

GET /api/platform/overview
  → Calls internally: /api/admin/setup/status, /api/tenants, /api/billing/invoices, /api/subscription/summary
  → All succeed (200)
  
GET /api/operations/notifications  
  → If called: 403 Forbidden ("Tenant context is required")
  → But component guard prevents this call entirely
```

**Tenant User:**
```
GET /api/auth/me
  → Response: { userType: "tenant_admin", tenant_id: "xyz", claims: {...} }

GET /api/dashboard
  → Success (200)
  
GET /api/operations/notifications
  → Success (200) - returns tenant notifications
```

---

## ⚠️ Known Behaviors

1. **Middleware redirect is transparent** - User won't see it, just lands on /platform
2. **NotificationBell gracefully silent** - Platform admins see empty bell, no error
3. **Support tools read-only** - Tenant inspection shows data but no modify actions
4. **Session cookie shared** - But JWT claims distinguish user type

---

## 🔍 Monitoring

Watch for these in production logs:
- ❌ **BAD**: `403 Forbidden` on `/api/operations/*` from platform_admin users
- ✅ **GOOD**: Indicates platform admin tried tenant endpoint (caught by guard)
- ❌ **BAD**: `500 Internal Server Error` on `/api/operations/notifications` when loading /platform
- ✅ **GOOD**: This should never happen now
- ✅ **GOOD**: Platform admins consistently redirected by middleware to /platform

