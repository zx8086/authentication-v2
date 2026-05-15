// src/telemetry/span-event-names.ts

/**
 * Type-safe event name constants used by both the TelemetryEmitter (span events)
 * and the structured logger (log line `event_name` field).
 *
 * Span events are timestamped annotations attached to spans that are ALWAYS
 * captured regardless of LOG_LEVEL. Log lines carry the same constant in the
 * `event_name` attribute so dashboards/alerts in the observability backend
 * have one source of truth.
 *
 * Naming Convention: <component>.<sub_component>.<action>
 * - Use lowercase with dots as separators
 * - Be specific about the action (state.open vs just open)
 */
export const SpanEvents = {
  // Circuit Breaker Events
  CB_STATE_OPEN: "circuit_breaker.state.open",
  CB_STATE_HALF_OPEN: "circuit_breaker.state.half_open",
  CB_STATE_CLOSED: "circuit_breaker.state.closed",
  CB_FALLBACK_USED: "circuit_breaker.fallback.used",
  CB_REQUEST_REJECTED: "circuit_breaker.request.rejected",
  CB_TIMEOUT: "circuit_breaker.timeout",
  CB_SUCCESS: "circuit_breaker.success",
  CB_FAILURE: "circuit_breaker.failure",
  CB_CACHE_CLEARED: "circuit_breaker.cache.cleared",
  CB_STATS_FAILED: "circuit_breaker.stats.failed",

  // Cache Connection Events
  CACHE_CONNECTED: "cache.connection.established",
  CACHE_DISCONNECTED: "cache.connection.lost",
  CACHE_CONNECTION_BROKEN: "cache.connection.broken",
  CACHE_RECONNECT_STARTED: "cache.reconnect.started",
  CACHE_RECONNECT_SUCCESS: "cache.reconnect.success",
  CACHE_RECONNECT_FAILED: "cache.reconnect.failed",
  CACHE_RECONNECT_EXHAUSTED: "cache.reconnect.exhausted",

  // Cache Operations Events
  CACHE_HIT: "cache.hit",
  CACHE_MISS: "cache.miss",
  CACHE_SET: "cache.set",
  CACHE_DELETE: "cache.delete",
  CACHE_STALE_RETRIEVED: "cache.stale.retrieved",
  CACHE_OPERATION_STARTED: "cache.operation.started",
  CACHE_OPERATION_COMPLETED: "cache.operation.completed",
  CACHE_OPERATION_FAILED: "cache.operation.failed",

  // Cache Circuit Breaker Events
  CACHE_CB_STATE_CHANGE: "cache.circuit_breaker.state_change",
  CACHE_CB_RECOVERED: "cache.circuit_breaker.recovered",
  CACHE_CB_FAILURE: "cache.circuit_breaker.failure",

  // Cache Health Monitor Events
  CACHE_HEALTH_STARTED: "cache.health.monitoring_started",
  CACHE_HEALTH_STOPPED: "cache.health.monitoring_stopped",
  CACHE_HEALTH_CHANGED: "cache.health.status_changed",
  CACHE_HEALTH_CHECK_SUCCESS: "cache.health.check_success",
  CACHE_HEALTH_CHECK_FAILED: "cache.health.check_failed",
  CACHE_HEALTH_RESET: "cache.health.reset",
  CACHE_HEALTH_CHECK_FAILED_LEGACY: "cache.health_check.failed",

  // Cache Stats / Resilience Events
  CACHE_STATS_FAILED: "cache.stats.failed",
  CACHE_RESILIENCE_STATS_FAILED: "cache.resilience_stats.failed",

  // Cache Connection State Events
  CACHE_STATE_CHANGED: "cache.state.changed",
  CACHE_STATE_RESET: "cache.state.reset",
  CACHE_STATE_SHUTDOWN: "cache.state.shutdown",

  // Cache Factory/Manager Events
  CACHE_FACTORY_INITIALIZING: "cache.factory.initializing",
  CACHE_FACTORY_INITIALIZED: "cache.factory.initialized",
  CACHE_FACTORY_CREATED: "cache.factory.created",
  CACHE_FACTORY_FAILED: "cache.factory.failed",
  CACHE_FACTORY_RECONFIGURE_FAILED: "cache.factory.reconfigure_failed",
  CACHE_FACTORY_SHUTDOWN: "cache.factory.shutdown",
  CACHE_MANAGER_INITIALIZING: "cache.manager.initializing",
  CACHE_MANAGER_INITIALIZED: "cache.manager.initialized",
  CACHE_MANAGER_RECONFIGURED: "cache.manager.reconfigured",
  CACHE_MANAGER_SHUTDOWN: "cache.manager.shutdown",

  // Kong Events
  KONG_CONSUMER_FOUND: "kong.consumer.found",
  KONG_CONSUMER_NOT_FOUND: "kong.consumer.not_found",
  KONG_CONSUMER_MISMATCH: "kong.consumer.mismatch",
  KONG_CACHE_HIT: "kong.cache.hit",
  KONG_CACHE_MISS: "kong.cache.miss",
  KONG_SECRET_CREATED: "kong.secret.created",
  KONG_SECRET_COLLISION: "kong.secret.collision",
  KONG_HEALTH_CHECK: "kong.health_check",
  KONG_REALM_CREATED: "kong.realm.created",
  KONG_REQUEST_SUCCESS: "kong.request.success",
  KONG_REQUEST_FAILED: "kong.request.failed",
  KONG_REQUEST_RETRIED: "kong.request.retried",
  KONG_CONNECTIVITY_CHECK: "kong.connectivity.check",
  KONG_DEGRADED_MODE_ENTERED: "kong.degraded_mode.entered",
  KONG_HEALTH_CHECK_FAILED: "kong.health_check.failed",
  KONG_HEALTH_CHECK_SUCCESS: "kong.health_check.success",

  // JWT Events
  JWT_GENERATED: "jwt.generated",
  JWT_GENERATION_FAILED: "jwt.generation.failed",
  JWT_VALIDATED: "jwt.validated",
  JWT_VALIDATION_FAILED: "jwt.validation.failed",
  JWT_EXPIRED: "jwt.expired",
  JWT_NOT_YET_VALID: "jwt.not_yet_valid",

  // Auth Flow Events
  AUTH_HEADERS_VALIDATED: "auth.headers.validated",
  AUTH_HEADERS_INVALID: "auth.headers.invalid",
  AUTH_CONSUMER_ANONYMOUS: "auth.consumer.anonymous",
  AUTH_REQUEST_SUCCESS: "auth.request.success",
  AUTH_REQUEST_FAILED: "auth.request.failed",

  // Health Check Events
  HEALTH_CHECK_SUCCESS: "health.check.success",
  HEALTH_CHECK_DEGRADED: "health.check.degraded",
  HEALTH_CHECK_FAILED: "health.check.failed",
  HEALTH_CHECK_INITIATED: "health.check.initiated",
  HEALTH_METRICS_INITIATED: "health.metrics.initiated",
  HEALTH_READINESS_INITIATED: "health.readiness.initiated",
  HEALTH_READINESS_SUCCESS: "health.readiness.success",
  HEALTH_READINESS_FAILED: "health.readiness.failed",
  HEALTH_TELEMETRY_INITIATED: "health.telemetry.initiated",

  // HTTP Request Events
  HTTP_REQUEST_STARTED: "http.request.started",
  HTTP_REQUEST_COMPLETED: "http.request.completed",
  HTTP_REQUEST_FAILED: "http.request.failed",
  HTTP_ERROR_UNHANDLED: "http.error.unhandled",

  // Token Handler Events
  TOKEN_REQUEST_STARTED: "token.request.started",
  TOKEN_REQUEST_SUCCESS: "token.request.success",
  TOKEN_REQUEST_FAILED: "token.request.failed",
  TOKEN_VALIDATION_STARTED: "token.validation.started",
  TOKEN_VALIDATION_SUCCESS: "token.validation.success",
  TOKEN_VALIDATION_FAILED: "token.validation.failed",

  // Validation Events
  VALIDATION_FAILED: "validation.failed",
  VALIDATION_FAILED_STRICT: "validation.failed.strict",
  VALIDATION_JSON_PARSE_FAILED: "validation.json.parse_failed",
  VALIDATION_ARRAY_FILTERED: "validation.array.filtered",
  VALIDATION_METHOD_NOT_ALLOWED: "validation.method.not_allowed",
  VALIDATION_CONTENT_TYPE_INVALID: "validation.content_type.invalid",
  VALIDATION_BODY_TOO_LARGE: "validation.body.too_large",

  // Lifecycle State Machine Events
  LIFECYCLE_STATE_CHANGED: "lifecycle.state.changed",
  LIFECYCLE_DRAIN_STARTED: "lifecycle.drain.started",
  LIFECYCLE_DRAIN_COMPLETED: "lifecycle.drain.completed",
  LIFECYCLE_DRAIN_TIMEOUT: "lifecycle.drain.timeout",
  LIFECYCLE_COMPONENT_REGISTERED: "lifecycle.component.registered",
  LIFECYCLE_COMPONENT_SHUTDOWN: "lifecycle.component.shutdown",
  LIFECYCLE_SHUTDOWN_STARTED: "lifecycle.shutdown.started",
  LIFECYCLE_SHUTDOWN_COMPLETED: "lifecycle.shutdown.completed",
  LIFECYCLE_SHUTDOWN_STEP: "lifecycle.shutdown.step",
  LIFECYCLE_SHUTDOWN_FLUSH_COMPLETE: "lifecycle.shutdown.flush_complete",
  LIFECYCLE_SHUTDOWN_FLUSH_TIMEOUT: "lifecycle.shutdown.flush_timeout",
  LIFECYCLE_SHUTDOWN_CONSOLE_FLUSH: "lifecycle.shutdown.console_flush",

  // Request Tracking Events
  REQUEST_INFLIGHT_STARTED: "request.inflight.started",
  REQUEST_INFLIGHT_COMPLETED: "request.inflight.completed",
  REQUEST_REJECTED_DRAINING: "request.rejected.draining",
  REQUEST_REJECTED_NOT_READY: "request.rejected.not_ready",

  // Redis Operation Tracking Events
  REDIS_OPERATION_STARTED: "redis.operation.started",
  REDIS_OPERATION_COMPLETED: "redis.operation.completed",
  REDIS_OPERATION_DRAIN_WAIT: "redis.operation.drain_wait",

  // DNS Events
  DNS_PREFETCH_INITIATED: "dns.prefetch.initiated",
  DNS_PREFETCH_FAILED: "dns.prefetch.failed",

  // GC Metrics Events
  GC_METRICS_STARTED: "gc.metrics.started",
  GC_METRICS_STOPPED: "gc.metrics.stopped",
  GC_METRICS_ALREADY_INITIALIZED: "gc.metrics.already_initialized",
  GC_METRICS_CALLBACK_ERROR: "gc.metrics.callback_error",
  GC_METRICS_INITIALIZATION_COMPLETED: "gc_metrics.initialization.completed",

  // Server Lifecycle Events
  SERVER_STARTUP_INITIATED: "server.startup.initiated",
  SERVER_STARTUP_COMPLETED: "server.startup.completed",
  SERVER_STARTUP_FAILED: "server.startup.failed",
  SERVER_STARTUP_TROUBLESHOOTING_HINT: "server.startup.troubleshooting_hint",
  SERVER_ENDPOINTS_CONFIGURED: "server.endpoints.configured",
  SERVER_LIFECYCLE_READY: "server.lifecycle.ready",
  SERVER_SHUTDOWN_TIMEOUT: "server.shutdown.timeout",
  SERVER_SHUTDOWN_DRAIN_TIMEOUT: "server.shutdown.drain_timeout",
  SERVER_SHUTDOWN_DUPLICATE: "server.shutdown.duplicate",
  SERVER_SHUTDOWN_FAILED: "server.shutdown.failed",
  SERVER_SHUTDOWN_PARTIAL_FAILURE: "server.shutdown.partial_failure",
  SERVER_ERROR_UNCAUGHT_EXCEPTION: "server.error.uncaught_exception",
  SERVER_ERROR_UNHANDLED_REJECTION: "server.error.unhandled_rejection",
  SERVER_SHUTDOWN_INITIATED: "server.shutdown.initiated",
  SERVER_SHUTDOWN_COMPLETED: "server.shutdown.completed",
  SERVER_SHUTDOWN_ERROR: "server.shutdown.error",

  // OpenAPI Spec Events
  OPENAPI_SPEC_REQUESTED: "openapi.spec.requested",
  OPENAPI_SPEC_SERVED: "openapi.spec.served",
  OPENAPI_SPEC_CACHED: "openapi.spec.cached",
  OPENAPI_SPEC_NOT_MODIFIED: "openapi.spec.not_modified",

  // Metrics Endpoint / System Events
  METRICS_EXPORT_STARTED: "metrics.export.started",
  METRICS_EXPORT_SUCCESS: "metrics.export.success",
  METRICS_EXPORT_SKIPPED: "metrics.export.skipped",
  METRICS_SYSTEM_SHUTDOWN: "metrics.system.shutdown",
  METRICS_DEBUG_ENDPOINTS_READY: "metrics.debug_endpoints.ready",
  METRICS_UNIFIED_STARTED: "metrics.unified.started",
  METRICS_UNIFIED_FAILED: "metrics.unified.failed",
  METRICS_TEST_STARTED: "metrics.test.started",
  METRICS_TEST_COMPLETED: "metrics.test.completed",
  METRICS_TEST_SUCCESS: "metrics.test.success",
  METRICS_TEST_FAILED: "metrics.test.failed",
  METRICS_TEST_NOT_INITIALIZED: "metrics.test.not_initialized",
  METRICS_CACHE_STATS_FAILED: "metrics.cache_stats.failed",
  METRICS_CIRCUIT_BREAKER_STATS_FAILED: "metrics.circuit_breaker_stats.failed",
  METRICS_CARDINALITY_RESET: "metrics.cardinality.reset",
  METRICS_CONSUMER_VOLUME_RESET: "metrics.consumer_volume.reset",
  // Metric instrument record failures (one per facet)
  METRICS_API_VERSION_RECORD_FAILED: "metrics.api_version.record_failed",
  METRICS_AUTH_RECORD_FAILED: "metrics.auth.record_failed",
  METRICS_CACHE_RECORD_FAILED: "metrics.cache.record_failed",
  METRICS_CIRCUIT_BREAKER_RECORD_FAILED: "metrics.circuit_breaker.record_failed",
  METRICS_CONSUMER_RECORD_FAILED: "metrics.consumer.record_failed",
  METRICS_ERROR_RECORD_FAILED: "metrics.error.record_failed",
  METRICS_HTTP_RECORD_FAILED: "metrics.http.record_failed",
  METRICS_KONG_RECORD_FAILED: "metrics.kong.record_failed",
  METRICS_PROCESS_RECORD_FAILED: "metrics.process.record_failed",
  METRICS_REDIS_RECORD_FAILED: "metrics.redis.record_failed",
  METRICS_SECURITY_RECORD_FAILED: "metrics.security.record_failed",
  METRICS_TELEMETRY_RECORD_FAILED: "metrics.telemetry.record_failed",
  METRICS_INITIALIZATION_LOG: "metrics.initialization.log",

  // SLA Monitor Events
  SLA_MONITOR_STARTED: "sla.monitor.started",
  SLA_MONITOR_SHUTDOWN: "sla.monitor.shutdown",
  SLA_VIOLATION_DETECTED: "sla.violation.detected",
  SLA_PROFILING_FAILED: "sla.profiling.failed",

  // Telemetry Subsystem Events
  TELEMETRY_INITIALIZATION_COMPLETED: "telemetry.initialization.completed",
  TELEMETRY_INITIALIZATION_FAILED: "telemetry.initialization.failed",
  TELEMETRY_CONFIGURATION_LOADED: "telemetry.configuration.loaded",
  TELEMETRY_CIRCUIT_BREAKER_OPENED: "telemetry.circuit_breaker.opened",
  TELEMETRY_CIRCUIT_BREAKER_CLOSED: "telemetry.circuit_breaker.closed",
  TELEMETRY_CIRCUIT_BREAKER_HALF_OPENED: "telemetry.circuit_breaker.half_opened",
  TELEMETRY_CIRCUIT_BREAKER_FAILURE_RECORDED: "telemetry.circuit_breaker.failure_recorded",
  TELEMETRY_CIRCUIT_BREAKER_RESET: "telemetry.circuit_breaker.reset",
  TELEMETRY_CIRCUIT_BREAKER_SHUTDOWN: "telemetry.circuit_breaker.shutdown",

  // Performance Measurement Events
  PERFORMANCE_MEASURE_COMPLETED: "performance.measure.completed",

  // Profiling Service Events
  PROFILING_SERVICE_INITIALIZED: "profiling.service.initialized",
  PROFILING_SERVICE_STATUS: "profiling.service.status",
  PROFILING_PRODUCTION_AVAILABLE: "profiling.production.available",
  PROFILING_PRODUCTION_ENABLED: "profiling.production.enabled",
  PROFILING_SHUTDOWN_INITIATED: "profiling.shutdown.initiated",
  PROFILING_SHUTDOWN_COMPLETED: "profiling.shutdown.completed",
  PROFILING_SHUTDOWN_DISABLED: "profiling.shutdown.disabled",
  PROFILING_CLEANUP_REQUESTED: "profiling.cleanup.requested",
  PROFILING_CLEANUP_COMPLETED: "profiling.cleanup.completed",
  PROFILING_CLEANUP_FAILED: "profiling.cleanup.failed",
  PROFILING_CLEANUP_DISABLED: "profiling.cleanup.disabled",
  PROFILING_START_REQUESTED: "profiling.start.requested",
  PROFILING_START_REJECTED: "profiling.start.rejected",
  PROFILING_START_DISABLED: "profiling.start.disabled",
  PROFILING_STOP_REQUESTED: "profiling.stop.requested",
  PROFILING_STOP_DISABLED: "profiling.stop.disabled",
  PROFILING_STOP_NO_SESSIONS: "profiling.stop.no_sessions",
  PROFILING_STATUS_REQUESTED: "profiling.status.requested",
  PROFILING_REPORT_REQUESTED: "profiling.report.requested",
  PROFILING_REPORTS_REQUESTED: "profiling.reports.requested",
  PROFILING_SESSION_STARTING: "profiling.session.starting",
  PROFILING_SESSION_STARTED: "profiling.session.started",
  PROFILING_SESSION_START_FAILED: "profiling.session.start_failed",
  PROFILING_SESSION_STOPPED: "profiling.session.stopped",
  PROFILING_SESSION_STOP_FAILED: "profiling.session.stop_failed",
  PROFILING_SESSION_COMPLETED: "profiling.session.completed",
  PROFILING_SESSION_ALL_STOPPED: "profiling.session.all_stopped",
  PROFILING_QUEUE_INITIALIZED: "profiling.queue.initialized",
  PROFILING_QUEUE_DIRECTORY_CREATED: "profiling.queue.directory_created",
  PROFILING_QUEUE_DIRECTORY_SIZE_FAILED: "profiling.queue.directory_size_failed",
  PROFILING_QUEUE_PROCESSING: "profiling.queue.processing",
  PROFILING_QUEUE_REQUEST_QUEUED: "profiling.queue.request_queued",
  PROFILING_QUEUE_REQUEST_REJECTED: "profiling.queue.request_rejected",
  PROFILING_QUEUE_FULL: "profiling.queue.full",
  PROFILING_QUEUE_STORAGE_EXCEEDED: "profiling.queue.storage_exceeded",
  PROFILING_QUEUE_SHUTDOWN: "profiling.queue.shutdown",
  PROFILING_OVERHEAD_MONITOR_INITIALIZED: "profiling.overhead_monitor.initialized",
  PROFILING_OVERHEAD_MONITOR_STARTED: "profiling.overhead_monitor.started",
  PROFILING_OVERHEAD_MONITOR_STOPPED: "profiling.overhead_monitor.stopped",
  PROFILING_OVERHEAD_MONITOR_SHUTDOWN: "profiling.overhead_monitor.shutdown",
  PROFILING_OVERHEAD_MONITOR_ALREADY_ACTIVE: "profiling.overhead_monitor.already_active",
  PROFILING_OVERHEAD_MONITOR_NOT_ACTIVE: "profiling.overhead_monitor.not_active",
  PROFILING_OVERHEAD_MONITOR_AUTO_STOP: "profiling.overhead_monitor.auto_stop",
  PROFILING_OVERHEAD_MONITOR_BASELINE_COMPLETE: "profiling.overhead_monitor.baseline_complete",
  PROFILING_OVERHEAD_MONITOR_THRESHOLD_EXCEEDED: "profiling.overhead_monitor.threshold_exceeded",

  // Memory Guardian Events
  MEMORY_GUARDIAN_EXPORT_BACKLOG: "memory.guardian.export_backlog",
  MEMORY_GUARDIAN_EXPORT_FAILURE_RATE: "memory.guardian.export_failure_rate",

  // Logger Internal Sentinels (used by the runtime event_name guard)
  LOGGER_EVENT_NAME_MISSING: "logger.event_name.missing",
  LOGGER_UNKNOWN: "unknown",
} as const;

/**
 * Type representing all valid event names (used for both span events and
 * the structured logger's `event_name` field).
 */
export type SpanEventName = (typeof SpanEvents)[keyof typeof SpanEvents];
