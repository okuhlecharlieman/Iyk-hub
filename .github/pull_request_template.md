# Pull Request Template

## 📝 Description
Brief description of changes...

## 🎯 Type of Change
- [ ] Security improvement
- [ ] Bug fix
- [ ] Feature addition
- [ ] Performance optimization
- [ ] Documentation update
- [ ] Refactoring

## 📋 Pre-Submission Checklist

### Code Quality
- [ ] Code follows existing style and conventions
- [ ] No console.log() statements left in (except development)
- [ ] No hardcoded secrets or sensitive data
- [ ] No unnecessary dependencies added

### Security Review
- [ ] All endpoints authenticate users (if required)
- [ ] Admin-only endpoints verified with `AuthMiddleware.requireAdmin()`
- [ ] All inputs validated with `ValidationSchema`
- [ ] No extra fields accepted in request bodies
- [ ] Errors don't leak sensitive information
- [ ] No client-side permission checks only
- [ ] Resource ownership verified on server (when applicable)

### API Improvements (for endpoints)
- [ ] Uses `withErrorHandling()` wrapper
- [ ] Errors are standardized types from `error-handler.js`
- [ ] Input validation with `ValidationSchema`
- [ ] Rate limiting applied (if public/write-heavy)
- [ ] Audit logging added for privileged actions
- [ ] Security events logged for unauthorized attempts

### Testing
- [ ] Changes tested locally
- [ ] Edge cases considered
- [ ] Error cases handled
- [ ] Rate limiting tested (if applicable)
- [ ] Integration test added/updated

### Documentation
- [ ] Changes documented if impacting API contract
- [ ] Security considerations documented
- [ ] Breaking changes clearly noted
- [ ] README/docs updated if needed

## 📊 What Changed

### Modified Files
- [ ] `/src/app/api/...` - Endpoint changes
- [ ] `/src/lib/...` - Utility/library changes
- [ ] `/docs/...` - Documentation changes
- [ ] Other: ___________

### Before/After (for refactoring)
**Before:**
```javascript
// Original code
```

**After:**
```javascript
// Refactored code
```

## 🔐 Security Considerations

- [ ] No new vulnerabilities introduced
- [ ] Rate limits appropriate for endpoint
- [ ] Permissions properly validated
- [ ] Audit logging complete
- [ ] No data exposure risks

## 🧪 Testing Notes

Tested scenarios:
- [ ] Happy path - success case
- [ ] No authentication - should fail with 401
- [ ] Invalid role - should fail with 403
- [ ] Invalid input - should fail with 400
- [ ] Rate limiting - should return 429 after limit
- [ ] Resource ownership - non-owner can't access

## 📚 Related Issues
Closes #...

## 🎓 Learning/Notes
Any gotchas, patterns, or learnings to share with the team...

---

## Reviewer Checklist

- [ ] Code is readable and follows patterns
- [ ] Security improvements validated
- [ ] Tests are comprehensive
- [ ] Documentation is clear
- [ ] Performance impact acceptable
- [ ] No regressions introduced

---

## 🚀 Post-Merge

- [ ] Monitor error logs for this endpoint
- [ ] Check audit logs for any issues
- [ ] Verify monitoring/alerting if applicable
- [ ] Document any known issues discovered

