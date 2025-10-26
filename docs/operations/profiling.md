# CPU and Memory Profiling

The authentication service includes comprehensive CPU and memory profiling capabilities using Bun's native profiling infrastructure with Chrome DevTools integration for performance analysis and debugging.

## Profiling Implementation Overview

The service implements a **native Bun profiling solution** that leverages Bun's built-in `--inspect` functionality with Chrome DevTools integration, providing enterprise-grade performance analysis without external dependencies.

### Key Features
- **Native Bun Integration**: Uses Bun's native profiling capabilities with `--inspect` flags
- **Chrome DevTools Integration**: Interactive profiling through Chrome's Performance and Memory tabs
- **Current Process Profiling**: Profiles the running service process for real-world performance data
- **Zero External Dependencies**: No additional libraries required for core profiling functionality
- **Environment-Based Security**: Production disabled with comprehensive safety controls
- **API Control**: RESTful endpoints for programmatic profiling session management

## Architecture and Design

### Security-First Design
- **Production Safety**: Profiling NEVER enabled in production environment
- **Environment Checks**: Only works in development, staging, and local environments
- **Safe Defaults**: Disabled by default, must be explicitly enabled via environment variables
- **Clean Shutdown**: Automatic cleanup on server shutdown and graceful session management

### Implementation Approach
The service originally planned to use `@platformatic/flame` but encountered fundamental compatibility issues with Bun's TypeScript runtime. The implementation was successfully pivoted to use **Bun's native profiling capabilities**, providing superior integration with the existing runtime.

**What Changed:**
- **Before (Non-Working)**: `@platformatic/flame` external dependency with module resolution errors
- **After (Working Solution)**: Native Bun profiling using `--inspect` flags with Chrome DevTools integration

## Available Profiling Scripts

```bash
# Core profiling commands
bun run profile:start         # Start server with profiling enabled
bun run profile:status        # Check profiling status
bun run profile:start-session # Start profiling session
bun run profile:stop-session  # Stop profiling session
bun run profile:reports       # List available reports
bun run profile:clean         # Clean profiling artifacts
bun run profile:dev           # Development server with profiling
bun run profile:load-test     # Profile during K6 load testing
bun run profile:k6            # Quick K6 + profiling
bun run profile:help          # Display all profiling commands
```

## Available API Endpoints

All profiling endpoints are restricted to development and staging environments only:

### POST /debug/profiling/start
Start a profiling session for performance analysis.

**Request**
```http
POST /debug/profiling/start HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Profiling session started",
  "sessionId": "prof-12345",
  "devToolsUrl": "chrome-devtools://devtools/bundled/inspector.html?ws=localhost:9229/12345"
}
```

### POST /debug/profiling/stop
Stop the current profiling session.

**Request**
```http
POST /debug/profiling/stop HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Profiling session stopped",
  "sessionId": "prof-12345",
  "duration": "45.2s",
  "artifacts": [
    "profiling/profile-12345.cpuprofile",
    "profiling/heap-12345.heapsnapshot"
  ]
}
```

### GET /debug/profiling/status
Check profiling system status.

**Request**
```http
GET /debug/profiling/status HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "enabled": true,
  "active": false,
  "lastSession": {
    "id": "prof-12345",
    "startTime": "2025-01-15T11:30:00.000Z",
    "endTime": "2025-01-15T11:35:00.000Z",
    "duration": "5m"
  },
  "reports": [
    {
      "id": "prof-12345",
      "type": "cpu",
      "size": "2.4MB",
      "created": "2025-01-15T11:35:00.000Z"
    }
  ]
}
```

### GET /debug/profiling/reports
List available profiling reports.

**Request**
```http
GET /debug/profiling/reports HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "reports": [
    {
      "sessionId": "prof-12345",
      "type": "cpu",
      "filename": "profile-12345.cpuprofile",
      "size": "2.4MB",
      "created": "2025-01-15T11:35:00.000Z"
    },
    {
      "sessionId": "prof-12345",
      "type": "heap",
      "filename": "heap-12345.heapsnapshot",
      "size": "8.1MB",
      "created": "2025-01-15T11:35:00.000Z"
    }
  ]
}
```

### DELETE /debug/profiling/cleanup
Clean up profiling artifacts and sessions.

**Request**
```http
DELETE /debug/profiling/cleanup HTTP/1.1
Host: auth-service.example.com
```

**Response - Success (200 OK)**
```json
{
  "success": true,
  "message": "Profiling cleanup completed",
  "cleaned": {
    "reports": 3,
    "sessions": 2
  }
}
```

## How to Use the Profiling System

### 1. Basic Profiling Session

**Step 1: Start server with profiling enabled**
```bash
PROFILING_ENABLED=true NODE_ENV=development bun src/index.ts
```

**Step 2: Start a profiling session**
```bash
curl -X POST http://localhost:3000/debug/profiling/start
```

**Step 3: Run your operations**
```bash
# Generate some load
for i in {1..100}; do
  curl http://localhost:3000/tokens \
    -H "X-Consumer-ID: test-consumer" \
    -H "X-Consumer-Username: test-consumer"
done
```

**Step 4: Stop profiling session**
```bash
curl -X POST http://localhost:3000/debug/profiling/stop
```

### 2. Chrome DevTools Integration

**Step 1: Start server with profiling**
```bash
bun run profile:start
```

**Step 2: Open Chrome DevTools**
1. Open Chrome browser
2. Navigate to `chrome://inspect`
3. Click "Open dedicated DevTools for Node"
4. Go to the "Performance" or "Memory" tab
5. Click "Record" to start profiling

**Step 3: Run operations**
Execute the operations you want to profile

**Step 4: Stop recording**
Click "Stop" in Chrome DevTools to analyze results

### 3. Automated Load Testing with Profiling

```bash
# Profile during K6 load testing
bun run profile:load-test

# Quick smoke test with profiling
bun run profile:k6
```

## Environment Configuration

Add to your `.env` file to enable profiling:

```bash
PROFILING_ENABLED=true                      # Enable profiling (dev/staging only)
PROFILING_OUTPUT_DIR=profiling             # Output directory for artifacts
PROFILING_AUTO_GENERATE=false             # Auto-generate reports
```

## Performance Impact and Characteristics

### When Disabled (Default State)
- **Zero Performance Impact**: Profiling checks are performed only at startup
- **No Memory Overhead**: No profiling infrastructure loaded
- **Production Safe**: Multiple environment checks prevent accidental activation

### When Enabled (Development/Staging)
- **Minimal Overhead**: Uses Bun's native `--inspect` with minimal performance impact
- **Current Process Profiling**: Profile data collected in the running service process
- **Automatic Cleanup**: Artifact management and cleanup procedures handle disk usage

## Integration Status

All profiling integrations are working and tested:

- ✅ **Server startup/shutdown integration**: Profiling service initializes with the main server
- ✅ **OpenTelemetry tracing**: All profiling endpoints include distributed tracing
- ✅ **Environment-based security controls**: Production environment completely blocked
- ✅ **Graceful error handling**: Comprehensive error handling and session management
- ✅ **TypeScript compilation**: Zero TypeScript errors with full type safety
- ✅ **Code quality validation**: All Biome checks passed with proper formatting

## Advanced Usage Scenarios

### Development Workflow Integration
```bash
# Start development server with profiling enabled
PROFILING_ENABLED=true bun run dev

# In another terminal, perform profiling workflow
curl -X POST http://localhost:3000/debug/profiling/start
# ... run your development tests ...
curl -X POST http://localhost:3000/debug/profiling/stop
```

### Performance Testing Integration
```bash
# Combined performance testing with profiling
bun run profile:load-test

# This will:
# 1. Start server with profiling enabled
# 2. Start a profiling session
# 3. Run K6 load tests
# 4. Stop profiling session
# 5. Generate performance reports
```

### CI/CD Integration Potential
The profiling infrastructure is designed to support future CI/CD integration for performance regression detection:

- **Automated Performance Baselines**: Profile key operations during CI builds
- **Regression Detection**: Compare profiling results between releases
- **Performance Artifacts**: Store profiling reports as build artifacts

## Troubleshooting

### Common Issues and Solutions

#### Profiling endpoints return 404 or 401
- **Cause**: Service not started with profiling enabled or wrong environment
- **Solution**: Ensure `PROFILING_ENABLED=true` and `NODE_ENV` is development/staging/local

#### Chrome DevTools not connecting
- **Cause**: Server not started with `--inspect` flags or firewall blocking
- **Solution**: Use `bun run profile:start` and check port 9229 accessibility

#### No profiling data collected
- **Cause**: Session not started or stopped too quickly
- **Solution**: Ensure profiling session is active during operations

#### High memory usage during profiling
- **Cause**: Normal behavior - profiling collects detailed runtime data
- **Solution**: Monitor memory usage and clean up artifacts regularly

### Debug Commands
```bash
# Check profiling status
curl http://localhost:3000/debug/profiling/status

# List available reports
curl http://localhost:3000/debug/profiling/reports

# Clean up artifacts
curl -X DELETE http://localhost:3000/debug/profiling/cleanup
```

## Best Practices

### When to Use Profiling
- **Performance Investigation**: Identifying bottlenecks in request handling
- **Memory Leak Detection**: Analyzing memory usage patterns
- **Optimization Validation**: Verifying performance improvements
- **Load Testing Analysis**: Understanding behavior under load

### Profiling Workflow
1. **Enable profiling** in development/staging environment
2. **Start profiling session** before operations
3. **Execute representative workload** (realistic user scenarios)
4. **Stop profiling session** to capture data
5. **Analyze results** using Chrome DevTools or generated reports
6. **Clean up artifacts** to free disk space

### Data Interpretation
- **CPU Profiling**: Identify functions consuming most CPU time
- **Memory Profiling**: Detect memory leaks and allocation patterns
- **Timeline Analysis**: Understand request lifecycle and bottlenecks
- **Call Tree Analysis**: Identify hot paths and optimization opportunities

## Security Considerations

### Environment Restrictions
- **Production Blocked**: Multiple checks prevent production activation
- **Development Only**: Only works in development, staging, and local environments
- **No Data Exposure**: Profiling data stays on the server filesystem
- **Clean Shutdown**: Automatic cleanup on server termination

### Data Protection
- **Local Storage**: All profiling data stored locally on server
- **No Network Transmission**: Profiling data not sent over network
- **Temporary Files**: Artifacts cleaned up automatically or on-demand
- **Access Control**: Profiling endpoints require development environment

This native Bun implementation provides superior integration with the existing runtime while maintaining all essential profiling capabilities needed for performance analysis and debugging of the authentication service.