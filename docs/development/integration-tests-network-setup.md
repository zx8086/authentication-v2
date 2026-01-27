# Integration Tests - Network Configuration

## Automatic Solution: Curl Fallback (IMPLEMENTED)

**The Bun fetch networking bug is now automatically handled by the curl fallback workaround.**

The service uses `fetchWithFallback()` utility that automatically retries failed fetch requests via curl subprocess. This means:

- **No manual configuration needed** - Works out of the box with remote Kong instances
- **Transparent fallback** - Automatically activates when Bun fetch fails
- **Zero overhead** - Only uses curl when native fetch fails
- **Full compatibility** - Works with all HTTP methods and headers

### How It Works

```typescript
// Kong adapter automatically uses curl fallback
import { fetchWithFallback } from '../utils/bun-fetch-fallback';

// Tries fetch() first, falls back to curl if needed
const response = await fetchWithFallback(kongAdminUrl);
```

**Test Results:**
- Before fallback: 1981 tests passing
- After fallback: 1989 tests passing (+8 tests now work)

### Using Remote Kong Instances

Simply configure your `.env` with the remote Kong Admin URL:

```bash
# .env
KONG_ADMIN_URL=http://192.168.178.3:30001

# Run integration tests - curl fallback handles networking automatically
bun run test:integration
```

**That's it!** No SSH tunneling or port forwarding required.

### Verification

Test that curl fallback is working:

```bash
# Check Kong connectivity directly
curl http://192.168.178.3:30001/status

# Run integration tests
bun run test:integration

# Enable debug logging to see fallback in action
LOG_LEVEL=debug bun run test:integration
# Look for: "Fetch failed, trying curl fallback"
```

## Technical Details

**Problem:** Bun v1.3.6 has known networking bugs with local/private IP addresses:
- https://github.com/oven-sh/bun/issues/1425
- https://github.com/oven-sh/bun/issues/6885
- https://github.com/oven-sh/bun/issues/10731

**Solution:** Automatic curl fallback utility (`src/utils/bun-fetch-fallback.ts`)

**Documentation:** See `docs/workarounds/SIO-288-bun-fetch-curl-fallback.md` for complete implementation details.

## Alternative Manual Solutions

If you prefer not to use the curl fallback (e.g., for performance reasons), you can use manual port forwarding:

### Option 1: SSH Port Forward

Forward remote Kong to localhost:

```bash
# Forward remote Kong to local port
ssh -L 8001:192.168.178.3:30001 user@192.168.178.3 -N -f

# Update .env to use localhost
KONG_ADMIN_URL=http://localhost:8001
```

### Option 2: kubectl Port Forward

If Kong is in Kubernetes:

```bash
kubectl port-forward -n kong svc/kong-admin 8001:8001

# Update .env
KONG_ADMIN_URL=http://localhost:8001
```

### Option 3: Skip Integration Tests

Integration tests are optional and skip gracefully when Kong is unavailable:

```bash
# Run only unit tests (no Kong/Redis needed)
bun run test:bun
```

## Troubleshooting

### Tests Still Failing

1. **Check curl is available:**
   ```bash
   which curl
   ```

2. **Test Kong connectivity:**
   ```bash
   curl -I http://192.168.178.3:30001/status
   ```

3. **Verify environment variables:**
   ```bash
   grep KONG_ADMIN_URL .env
   ```

4. **Check network connectivity:**
   ```bash
   ping 192.168.178.3
   ```

### Fallback Seems Slow

Curl fallback adds 50-100ms latency, which is acceptable for error recovery. If this is unacceptable:
- Use SSH/kubectl port forwarding for faster localhost access
- Ensure Kong Admin API is responding quickly
- Check network latency to Kong instance

## Related Documentation

- **Curl Fallback Implementation**: `docs/workarounds/SIO-288-bun-fetch-curl-fallback.md`
- **Kong Test Setup**: `docs/development/kong-test-setup.md`
- **Test Documentation**: `test/README.md`
- **CLAUDE.md**: Live testing strategy
