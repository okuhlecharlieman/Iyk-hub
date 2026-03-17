# API Development Quick Reference

A quick reference guide for developing secure, scalable APIs in Intwana Hub.

## 1️⃣ Setup Your Endpoint

```javascript
import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/error-handler';
import { enforceRateLimit } from '@/lib/api/rate-limit';

export const GET = withErrorHandling(async (request) => {
  // Rate limit public endpoints
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: 'my-endpoint',
    limit: 100,
    windowMs: 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Your code here
  return NextResponse.json({ /* ... */ });
});
```

## 2️⃣ Add Authentication

```javascript
import { AuthMiddleware } from '@/lib/api/auth-middleware';

// Regular user auth
const user = await AuthMiddleware.authenticate(request);

// Admin-only
const admin = await AuthMiddleware.requireAdmin(request);

// Specific role
const creator = await AuthMiddleware.requireRole(request, ['admin', 'creator']);
```

## 3️⃣ Validate Inputs

```javascript
import { ValidationSchema, fieldTypes, commonFields } from '@/lib/api/schema-validation';

const schema = new ValidationSchema({
  email: commonFields.email(),
  displayName: commonFields.displayName(),
  age: fieldTypes.number({ min: 13, max: 120, nonNegative: true }),
  tags: fieldTypes.array(fieldTypes.string({ maxLength: 50 }), { maxLength: 10 }),
  role: fieldTypes.enum(['admin', 'user', 'creator']),
});

const body = await request.json();
const validated = schema.validate(body); // Throws BadRequestError if invalid
```

## 4️⃣ Handle Errors

```javascript
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/api/error-handler';

if (!data) {
  throw new NotFoundError('Resource not found');
}

if (!isOwner && !isAdmin) {
  throw new ForbiddenError('You cannot access this resource');
}

if (age < 13) {
  throw new BadRequestError('Invalid age', [
    { field: 'age', message: 'Must be at least 13 years old' }
  ]);
}
```

## 5️⃣ Check Permissions

```javascript
import { checkResourceAuthorization } from '@/lib/api/auth-middleware';

try {
  const { isOwner, isAdmin } = await checkResourceAuthorization(
    request,
    resource.ownerId,
    user
  );
} catch (error) {
  // Automatically logs unauthorized access and throws ForbiddenError
  throw error;
}
```

## 6️⃣ Log Important Actions

```javascript
import { logAdminAction, logSecurityEvent, logDataAccess } from '@/lib/api/logging';

// Admin actions
await logAdminAction({
  request,
  actor: user,
  action: 'user.role_changed',
  targetType: 'user',
  targetId: userId,
  metadata: { oldRole: 'user', newRole: 'admin' }
});

// Security events
await logSecurityEvent({
  request,
  eventType: 'unauthorized_access_attempt',
  userId: user.uid,
  severity: 'warning',
  description: 'User attempted to access admin endpoint'
});

// Data access (for compliance)
await logDataAccess({
  request,
  userId: user.uid,
  accessType: 'write',
  resourceType: 'post',
  resourceId: postId,
  isAuthorized: true
});
```

## 📋 Complete Example: Update User Profile

```javascript
import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/error-handler';
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { AuthMiddleware, checkResourceAuthorization } from '@/lib/api/auth-middleware';
import { ValidationSchema, commonFields } from '@/lib/api/schema-validation';
import { logDataAccess } from '@/lib/api/logging';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '@/lib/firebase/admin';

const updateSchema = new ValidationSchema({
  displayName: commonFields.displayName(),
  bio: commonFields.bio(),
  photoURL: commonFields.photoURL(),
});

export const PUT = withErrorHandling(async (request, { params }) => {
  // Rate limit writes
  const rl = enforceRateLimit(request, {
    keyPrefix: 'profile:update',
    limit: 30,
    windowMs: 60000,
  });
  if (rl) return rl;

  // Authenticate
  const user = await AuthMiddleware.authenticate(request);

  // Validate input
  const body = await request.json();
  const validated = updateSchema.validate(body);

  // Check permission
  await checkResourceAuthorization(request, params.userId, user);

  // Update
  await initializeFirebaseAdmin();
  const db = admin.firestore();
  await db.collection('users').doc(params.userId).update({
    ...validated,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Log
  await logDataAccess({
    request,
    userId: user.uid,
    accessType: 'write',
    resourceType: 'profile',
    resourceId: params.userId,
    isAuthorized: true,
  });

  return NextResponse.json({ success: true });
});
```

## 🚫 Common Mistakes to Avoid

```javascript
// ❌ NO: Forgetting to wrap with error handling
export async function GET(request) {
  // Code without withErrorHandling
}

// ✅ YES: Always wrap with error handling
export const GET = withErrorHandling(async (request) => {
  // Handler code
});

// ❌ NO: Trusting client-provided data without validation
const role = request.body.role; // User can set to 'admin'!

// ✅ YES: Validate all inputs
const { role } = schema.validate(request.body);

// ❌ NO: Checking auth on server but allowing client to bypass
if (request.body.isAdmin === true) { // Client can set this!
  // ...
}

// ✅ YES: Always verify auth on server
const user = await AuthMiddleware.authenticate(request);
const isAdmin = await checkIfAdmin(user.uid);

// ❌ NO: Logging sensitive data
console.log('User password:', password);

// ✅ YES: Log action, not sensitive data
logActionwait logAdminAction({
  request, actor, action: 'password_changed',
  targetType: 'user', targetId
});

// ❌ NO: Letting logging break your request
try {
  await logAdminAction(/*...*/);
} catch (e) {
  throw e; // Request fails!
}

// ✅ YES: Logging failures shouldn't break the request
await logAdminAction(/*...*/).catch(e => 
  console.error('Logging failed:', e)
);
```

## 🔍 Testing Checklist

Before calling your endpoint ready:

- [ ] Request without auth token → 401 error
- [ ] Request with invalid token → 401 error
- [ ] Valid request with wrong role → 403 error
- [ ] Request with extra fields → 400 error
- [ ] Request with invalid email/data → 400 error with details
- [ ] Valid request succeeds → proper response
- [ ] Rate limit exceeded → 429 with Retry-After
- [ ] Action logged to appropriate collection

## 📂 File Reference

| Purpose | File |
|---------|------|
| Error types | `src/lib/api/error-handler.js` |
| Validation | `src/lib/api/schema-validation.js` |
| Authentication | `src/lib/api/auth-middleware.js` |
| Logging | `src/lib/api/logging.js` |
| Rate limiting | `src/lib/api/rate-limit.js` |

## 📚 Read More

- **Full guide:** `docs/API_IMPROVEMENTS.md`
- **Reference:** `docs/EXAMPLE_REFACTORED_API.js`
- **Tests:** `src/__tests__/api.integration.test.js`
- **Checklist:** `docs/SECURITY_CHECKLIST.md`

---

**Remember:** Security is everyone's responsibility. Take these patterns seriously! 🔒
