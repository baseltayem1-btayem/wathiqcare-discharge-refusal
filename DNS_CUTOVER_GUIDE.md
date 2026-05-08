# WathiqCare Domain Cutover — DNS Configuration Guide

## Objective
Update **wathiqcare.online** to point to the new modular platform deployment on Vercel.

---

## Current Status

### Production Deployment (ACTIVE)
- **URL**: https://web-kaizcjuea-wathiqcare.vercel.app
- **Status**: ✅ LIVE (verified 401 response)
- **Platform**: Modular WathiqCare (43dff9d + fixes)
- **Build**: 189 pages, all routes compiled
- **RBAC**: 7 roles tested, all passing

### Domain Status (REQUIRES UPDATE)
- **Domain**: wathiqcare.online
- **Current Target**: 216.150.1.1 (OLD Vercel deployment)
- **DNS Provider**: domaincontrol.com (external, not Vercel-managed)
- **Nameservers**: ns59.domaincontrol.com, ns60.domaincontrol.com
- **Current Behavior**: Responds with 307 redirect to /ar (old deployment)

---

## Required DNS Changes

### Option 1: Update CNAME Record (RECOMMENDED)

1. Log in to **domaincontrol.com** (your DNS provider)
2. Find DNS management for **wathiqcare.online**
3. Locate or create **CNAME record** for root domain or **www**:
   - **Host/Name**: `wathiqcare.online` (or `@`)
   - **Points to**: `web-kaizcjuea-wathiqcare.vercel.app`
   - **TTL**: 3600 (or default)
4. **Save changes**

⏱️ **Propagation Time**: 15 minutes to 2 hours (typically 30 minutes)

### Option 2: Update A Record (If CNAME not possible)

If root domain CNAME conflicts (some registrars):
1. Look up current Vercel IP for `web-kaizcjuea-wathiqcare.vercel.app`:
   ```
   nslookup web-kaizcjuea-wathiqcare.vercel.app
   ```
2. Update **A record** to point to that IP
3. ⚠️ **Note**: Vercel IPs can change; CNAME is preferred

---

## Verification Steps

### Step 1: Verify DNS Resolution (Terminal Command)
```powershell
Resolve-DnsName -Name wathiqcare.online | Select-Object Name, Type, IPAddress, NameHost
```
**Expected**: Should resolve to `web-kaizcjuea-wathiqcare.vercel.app`

### Step 2: Test HTTPS Connection
```powershell
Invoke-WebRequest -Uri "https://wathiqcare.online" -SkipHttpErrorCheck
```
**Expected Status**: 401 (authentication required - normal for modular platform)

### Step 3: Browser Test
Navigate to: **https://wathiqcare.online**
- Should show WathiqCare login page
- Should NOT show redirect loop
- HTTPS should be valid (green lock icon)

### Step 4: Full Validation Checklist
After DNS update, verify:

- [ ] Homepage loads (https://wathiqcare.online)
- [ ] No redirect loops
- [ ] HTTPS certificate valid
- [ ] Module portal accessible after login
- [ ] All 3 module cards visible (for admin)
- [ ] Arabic/RTL rendering correct
- [ ] No 502/503/504 errors
- [ ] Performance acceptable (< 2s load time)

---

## Timeline

| Step | Action | Duration |
|---|---|---|
| **1** | Update DNS at domaincontrol.com | 5 min |
| **2** | Wait for DNS propagation | 15-120 min |
| **3** | Verify domain resolution | 2 min |
| **4** | Test in browser | 5 min |
| **5** | Run full validation | 10 min |
| **TOTAL** | | ~30-130 min |

---

## SSL Certificate Status

- **Vercel Deployment**: ✅ HTTPS active (Let's Encrypt)
- **wathiqcare.online**: ⏳ Will auto-provision after DNS propagates
- **Time to HTTPS**: Typically < 5 minutes after DNS resolves

---

## Troubleshooting

### Domain Not Resolving
**Problem**: `Resolve-DnsName wathiqcare.online` returns old IP  
**Solution**:
- Wait 15-30 minutes for DNS cache refresh
- Try: `ipconfig /flushdns` (Windows) then re-test
- Check domaincontrol.com to confirm CNAME was saved

### HTTPS Error / Invalid Certificate
**Problem**: Browser shows certificate error for wathiqcare.online  
**Solution**:
- Wait 5 minutes for Vercel to issue certificate
- Clear browser cache: Ctrl+Shift+Delete
- Try in incognito/private window

### 502/503 Error
**Problem**: wathiqcare.online returns 502 Bad Gateway  
**Solution**:
- Verify DNS points to `web-kaizcjuea-wathiqcare.vercel.app` (not IP)
- Check Vercel deployment status (should be "Ready")
- Wait 30 seconds and retry

### Redirect Loop
**Problem**: Page keeps redirecting  
**Solution**:
- Clear browser cookies for wathiqcare.online
- Try accessing https://wathiqcare.online/en/login directly
- Check DNS is not pointing to old deployment

---

## Rollback Plan

If issues occur:
1. Revert CNAME to previous target
2. Wait 15-30 minutes for propagation
3. Production service continues on previous deployment
4. Contact Vercel support for assistance

---

## Sign-Off

**DNS Update Required By**: Manual DNS provider configuration  
**Expected Completion**: Within 2 hours of DNS change  
**Verification**: See validation checklist above  

Once DNS is updated and verified, **wathiqcare.online will serve the modular platform** with full RBAC enforcement, all 3 modules, and complete backward compatibility.

---

**Next Action**: Update CNAME at domaincontrol.com, then run verification steps above.
