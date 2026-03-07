# Token Revocation Strategy

## Overview

JWT tokens are stateless by design (RFC 7519), meaning they remain valid until expiration. This document describes the strategies available for invalidating tokens before their natural expiry.

## Current Architecture

The Authentication Service generates short-lived JWT tokens (default: 15 minutes) signed with HMAC-SHA256. Token validation can occur at two levels:

| Validation Point | Method | Revocation Support |
|------------------|--------|-------------------|
| **Kong Gateway** | JWT Plugin validates signature + expiration | Secret rotation invalidates all tokens for a consumer |
| **Auth Service** | `/tokens/validate` endpoint | Validates signature + expiration + consumer existence |
| **Downstream Services** | Independent JWT validation | Only expiration-based; no revocation awareness |

## Revocation Strategies

### Strategy 1: Short Token Lifetime (Primary - Current)

The primary defense against compromised tokens is a short expiration window.

**Configuration:**
```bash
JWT_EXPIRATION_MINUTES=15   # Default: 15 minutes
```

**How it works:**
- Tokens expire naturally after the configured TTL
- Compromised tokens have a limited window of abuse
- No infrastructure overhead for revocation

**Trade-offs:**

| Advantage | Disadvantage |
|-----------|-------------|
| Zero infrastructure cost | Tokens valid until expiry |
| No additional latency | Shorter TTL = more token refresh traffic |
| Simplest to implement | Cannot revoke a specific token instantly |

**Recommended TTL by use case:**

| Use Case | Recommended TTL | Rationale |
|----------|----------------|-----------|
| High-security APIs | 5 minutes | Minimize exposure window |
| Standard APIs (default) | 15 minutes | Balance security and UX |
| Low-risk internal APIs | 30-60 minutes | Reduce token refresh overhead |

### Strategy 2: Consumer Secret Rotation (Available)

Rotating a consumer's JWT secret in Kong immediately invalidates all tokens signed with the old secret.

**How it works:**
1. Admin rotates the consumer's JWT credentials in Kong
2. Kong JWT Plugin rejects tokens signed with the old secret
3. Auth Service fetches the new secret on next token request (after cache TTL expires)

**Procedure:**
```bash
# 1. Delete old JWT credentials for the consumer
curl -X DELETE http://kong-admin:8001/consumers/{consumer}/jwt/{jwt-id}

# 2. Create new JWT credentials
curl -X POST http://kong-admin:8001/consumers/{consumer}/jwt

# 3. Wait for Auth Service cache to expire (default: 5 minutes)
#    Or restart Auth Service pods for immediate effect
```

**Trade-offs:**

| Advantage | Disadvantage |
|-----------|-------------|
| Invalidates all tokens for a consumer | Cannot target a specific token |
| Uses existing Kong infrastructure | Cache delay before Auth Service picks up new secret |
| No additional components needed | Requires Kong Admin API access |

**Cache considerations:**
- Auth Service caches consumer secrets with TTL (default: 300s)
- After secret rotation, the Auth Service may issue tokens with the old secret until the cache expires
- For immediate effect, restart the Auth Service pods or wait for cache TTL

### Strategy 3: Token Denylist (Not Implemented)

A denylist (or blocklist) would allow revoking specific tokens by their `jti` (JWT ID) claim.

**How it would work:**
1. Maintain a set of revoked token JTIs in Redis
2. Check the denylist on each token validation
3. Entries auto-expire when the token would naturally expire

**When to consider implementing:**
- Regulatory requirement for instant single-token revocation
- Compliance needs (e.g., GDPR right to access revocation)
- High-value transactions requiring immediate invalidation

**Implementation sketch:**
```typescript
// Revoke a token
await redis.set(`revoked:${jti}`, '1', 'EX', remainingTTL);

// Check during validation
const isRevoked = await redis.get(`revoked:${jti}`);
if (isRevoked) return { valid: false, reason: 'Token revoked' };
```

**Trade-offs:**

| Advantage | Disadvantage |
|-----------|-------------|
| Instant single-token revocation | Adds Redis dependency to validation path |
| Precise targeting | Additional latency per validation |
| Audit trail of revocations | Redis availability becomes critical for validation |

**This strategy is not currently implemented** because the short token lifetime (15 minutes) combined with consumer secret rotation provides sufficient revocation capability for the current use cases.

## Decision Matrix

| Need | Recommended Strategy |
|------|---------------------|
| General token expiry | Strategy 1: Short lifetime (default) |
| Block a compromised consumer | Strategy 2: Secret rotation |
| Revoke a specific token instantly | Strategy 3: Token denylist (requires implementation) |
| Regulatory compliance | Strategy 1 + Strategy 2 (evaluate Strategy 3 if required) |

## Security Considerations

- **Token storage**: Clients should store tokens securely (httpOnly cookies or secure memory)
- **Transport security**: Always use HTTPS to prevent token interception
- **Logging**: Token generation events are logged for audit (V2 API includes audit headers)
- **Monitoring**: Monitor `jwt_creation_duration_ms` and token generation error rates for anomalies

## Related Documentation

| Document | Description |
|----------|-------------|
| [JWT Token Specification](../api/jwt-tokens.md) | Token structure, claims, validation examples |
| [API Endpoints](../api/endpoints.md) | Token generation and validation endpoints |
| [Configuration Guide](../configuration/environment.md) | JWT expiration and Kong settings |
| [Architecture Overview](../architecture/overview.md) | Authentication flow and circuit breaker behavior |
