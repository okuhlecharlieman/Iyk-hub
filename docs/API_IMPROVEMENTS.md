# API Improvements Guide

This document outlines the new utilities and best practices for API development in Intwana Hub.

## New Utilities

### 1. Error Handling (`src/lib/api/error-handler.js`)

Provides standardized error types and consistent error responses.

**Usage:**

```javascript
import { badRequestError, UnauthorizedError, withErrorHandling } from '@/lib/api/error-handler';

// Throw specific errors
if (!isAdmin) {
  throw new ForbiddenError('Admin access required');
}

if (!data.email) {
  throw new BadRequestError('Email is required', [
    { field: 'email', message: 'Required field' }
  ]);
}

// Wrap handlers for automatic error handling
export const GET = withErrorHandling(async (request) => {
  // Your code here
  // Errors are automatically caught and formatted
});
```

### 2. Schema Validation (`src/lib/api/schema-validation.js`)

Type-safe input validation without external dependencies.

**Usage:**

```javascript
import { ValidationSchema, fieldTypes, commonFields } from '@/lib/api/schema-validation';

const updateUserSchema = new ValidationSchema({
  uid: commonFields.uid(),
  displayName: commonFields.displayName(),
  email: commonFields.email(),
  role: fieldTypes.enum(['admin', 'user']),
  skills: fieldTypes.array(commonFields.displayName(), { maxLength: 50 }),
});

export const PUT = async (request) => {
  const body = await request.json();
  const validated = updateUserSchema.validate(body);
  // validated now has clean, validated data
};
```

### 3. Authentication Middleware (`src/lib/api/auth-middleware.js`)

Simplified auth checking with consistent error handling.

**Usage:**

```javascript
import { AuthMiddleware, createProtectedRoute } from '@/lib/api/auth-middleware';

// Manual auth check
export const GET = async (request) => {
  const user = await AuthMiddleware.authenticate(request);
  // user.uid, user.email available
};

// Require admin
export const DELETE = async (request) => {
  const user = await AuthMiddleware.requireAdmin(request);
  // Throws ForbiddenError if not admin
};

// Easy protected route creation
export const POST = createProtectedRoute(
  async (request, { user }) => {
    // user automatically provided
  },
  { requireAdmin: true } // optional
);
```

### 4. Logging (`src/lib/api/logging.js`)

Comprehensive logging for auditing and debugging.

**Usage:**

```javascript
import { logAdminAction, logSecurityEvent, logDataAccess } from '@/lib/api/logging';

// Log admin actions
await logAdminAction({
  request,
  actor: user,
  action: 'user.role_changed',
  targetType: 'user',
  targetId: userId,
  metadata: { oldRole: 'user', newRole: 'admin' }
});

// Log security events
await logSecurityEvent({
  request,
  eventType: 'auth_failure',
  userId: null,
  severity: 'warning',
  description: 'Multiple failed login attempts'
});

// Log data access for compliance
await logDataAccess({
  request,
  userId: user.uid,
  accessType: 'read',
  resourceType: 'user_profile',
  resourceId: profileId,
  isAuthorized: true
});
```

## Migration Guide

### Before (Old Pattern)

```javascript
// Messy error handling
export async function GET(req) {
  try {
    const actor = await authenticate(req); // May throw but unclear what type
    const users = await listAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    if (error?.code === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    // And more if-else statements...
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### After (New Pattern)

```javascript
import { withErrorHandling } from '@/lib/api/error-handler';
import { AuthMiddleware } from '@/lib/api/auth-middleware';

export const GET = withErrorHandling(async (request) => {
  const user = await AuthMiddleware.requireAdmin(request);
  const users = await getUserList();
  return NextResponse.json(users);
  // Errors handled automatically with proper format
});
```

## API Security Checklist

- [ ] All admin endpoints use `AuthMiddleware.requireAdmin()`
- [ ] All endpoints that modify data have rate limiting
- [ ] All input validated with `ValidationSchema`
- [ ] All admin actions logged with `logAdminAction()`
- [ ] Unauthorized access attempts logged with `logSecurityEvent()`
- [ ] No sensitive data in error messages (production)
- [ ] All errors use standardized error types
- [ ] Endpoints reject extra fields in request body

## Common Patterns

### Protected Admin Endpoint

```javascript
import { AuthMiddleware, createProtectedRoute } from '@/lib/api/auth-middleware';
import { ValidationSchema, commonFields } from '@/lib/api/schema-validation';
import { logAdminAction } from '@/lib/api/logging';
import { withErrorHandling } from '@/lib/api/error-handler';

const schema = new ValidationSchema({
  uid: commonFields.uid(),
  role: fieldTypes.enum(['admin', 'user']),
});

export const PUT = withErrorHandling(
  createProtectedRoute(
    async (request, { user }) => {
      const body = await request.json();
      const { uid, role } = schema.validate(body);
      
      // Update user
      await updateUser(uid, { role });
      
      // Log action
      await logAdminAction({
        request,
        actor: user,
        action: 'user.role_updated',
        targetType: 'user',
        targetId: uid,
        metadata: { newRole: role }
      });
      
      return NextResponse.json({ success: true });
    },
    { requireAdmin: true }
  )
);
```

### Public Endpoint with Rate Limiting

```javascript
import { enforceRateLimit } from '@/lib/api/rate-limit';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: 'my-endpoint',
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  });
  if (rateLimitResponse) return rateLimitResponse;
  
  // Your endpoint logic
}
```

### User-Owned Resource Update

```javascript
import { checkResourceAuthorization } from '@/lib/api/auth-middleware';
import { logDataAccess } from '@/lib/api/logging';

export async function PUT(request, { params }) {
  const user = await AuthMiddleware.authenticate(request);
  const resource = await getResource(params.id);
  
  // Check authorization
  await checkResourceAuthorization(request, resource.userId, user);
  
  // Log access
  await logDataAccess({
    request,
    userId: user.uid,
    accessType: 'write',
    resourceType: 'post',
    resourceId: params.id,
    isAuthorized: true
  });
  
  // Update resource
  await updateResource(params.id, updateData);
  return NextResponse.json({ success: true });
}
```

## Testing

See `src/__tests__/api.integration.test.js` for comprehensive test examples.

Run tests with:
```bash
npm test
```

## Performance Notes

- Admin role check is cached for 5 minutes to reduce database queries
- Rate limiting uses in-memory Map (fine for single instance, use Redis for distributed)
- Validation is synchronous and performs no I/O
- Logging failures don't break requests (logged to console only)

## Monitoring & Alerts

Recommended Firestore collections to monitor:

1. **adminAuditLogs** - Track all privileged actions
2. **securityLogs** - Unauthorized attempts, suspicious activity
3. **dataAccessLogs** - Compliance and audit trail

Set up alerts for:
- Multiple failed login attempts from same IP
- Rapid role changes
- Bulk user deletions
- Unauthorized access patterns
