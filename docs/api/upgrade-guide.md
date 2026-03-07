# API Upgrade Guide

## Version Overview

The Authentication Service supports two API versions, selected via the `Accept-Version` header.

| Version | Status | Features |
|---------|--------|----------|
| **V1** | Stable | Standard headers, backward compatible |
| **V2** | Recommended | V1 + OWASP security headers, audit logging |

### Version Selection

```bash
# V1 (default if no header)
curl -H "Accept-Version: v1" http://localhost:3000/tokens

# V2 (recommended)
curl -H "Accept-Version: v2" http://localhost:3000/tokens
```

If no `Accept-Version` header is provided, the service defaults to V1 for backward compatibility.

## V1 to V2 Migration

### What Changes

V2 adds the following to all responses without breaking the V1 response format:

| Feature | V1 | V2 |
|---------|----|----|
| **OWASP Security Headers** | Not included | Included in all responses |
| **Audit Logging** | Not included | Authentication events logged |
| **Response Body** | Standard format | Same format as V1 |
| **Error Format** | RFC 7807 | RFC 7807 (same) |

### OWASP Security Headers (V2 Only)

V2 responses include these security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'none'
Cache-Control: no-store
Pragma: no-cache
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Migration Steps

1. **Test with V2**: Add `Accept-Version: v2` header to your requests and verify your client handles the additional response headers correctly
2. **Update clients**: Modify API clients to include the `Accept-Version: v2` header
3. **Deploy**: Roll out client changes
4. **Verify**: Confirm V2 headers are present in responses

### Compatibility Notes

- **Response body format is identical** between V1 and V2
- **No breaking changes** in the request format
- **V2 headers are additive** - they do not remove any V1 headers
- **Error responses** use the same RFC 7807 format in both versions

## V1 Sunset Timeline

**No V1 sunset date has been announced.** V1 remains fully supported.

When a sunset date is determined:
1. The service will add RFC 8594 Sunset headers to V1 responses
2. Clients will receive advance notice via the `Deprecation: true` header
3. The `Link` header will point to migration documentation
4. A minimum of 6 months advance notice will be provided

### Monitoring for Deprecation

Clients should monitor for these response headers:

```http
Sunset: <date>
Deprecation: true
Link: <migration-url>; rel="sunset"
```

**Environment configuration for deprecation headers:**
```bash
API_V1_SUNSET_DATE=2028-01-01T00:00:00Z
API_V1_MIGRATION_URL=https://api.example.com/docs/v2-migration
```

## Version Testing

```bash
# Test V1
curl -s -H "Accept-Version: v1" http://localhost:3000/health | jq .

# Test V2 (check security headers)
curl -si -H "Accept-Version: v2" http://localhost:3000/health | head -20

# Verify V2 includes OWASP headers
curl -si -H "Accept-Version: v2" http://localhost:3000/health | grep -i "x-content-type-options"
```

## Related Documentation

| Document | Description |
|----------|-------------|
| [API Endpoints](endpoints.md) | Complete API reference for all endpoints |
| [JWT Token Specification](jwt-tokens.md) | Token format and validation |
| [Configuration Guide](../configuration/environment.md) | Sunset header configuration |
| [Troubleshooting Guide](../operations/troubleshooting.md) | Common issues and resolution |
