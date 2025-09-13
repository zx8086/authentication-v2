/* src/telemetry/logger.ts */

// 8-Layer Logging Architecture from implementation guide
import * as api from '@opentelemetry/api-logs';
import * as trace from '@opentelemetry/api';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { telemetryConfig } from './config';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO', 
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  consumerId?: string;
  operation?: string;
  duration?: number;
  httpMethod?: string;
  httpUrl?: string;
  httpStatusCode?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  kong?: {
    operation?: string;
    consumerUuid?: string;
    responseTime?: number;
    success?: boolean;
  };
  jwt?: {
    operation?: string;
    keyId?: string;
    duration?: number;
    username?: string;
  };
  [key: string]: any;
}

// Layer 1: Trace Context Injection
class TraceContextInjector {
  static inject(context: LogContext = {}): LogContext {
    try {
      const activeSpan = trace.trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        return {
          ...context,
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
          traceFlags: spanContext.traceFlags
        };
      }
    } catch (error) {
      // Silent fallback
    }
    return context;
  }
}

// Layer 2: Sampling Logic (Disabled - Collector handles sampling)
class SamplingManager {
  static shouldSample(level: LogLevel, context?: LogContext): boolean {
    // Always send all logs to collector - let collector handle sampling
    return true;
  }
}

// Layer 3: Circuit Breaker
class CircuitBreaker {
  private static failureCount = 0;
  private static lastFailureTime = 0;
  private static circuitOpen = false;
  private static readonly failureThreshold = 5;
  private static readonly timeoutMs = 30000; // 30 seconds
  
  static canProceed(): boolean {
    const now = Date.now();
    
    // Reset circuit if timeout has passed
    if (this.circuitOpen && now - this.lastFailureTime > this.timeoutMs) {
      this.circuitOpen = false;
      this.failureCount = 0;
    }
    
    return !this.circuitOpen;
  }
  
  static recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    console.warn(`[CIRCUIT-BREAKER] Failure recorded. Count: ${this.failureCount}/${this.failureThreshold}`);
    
    if (this.failureCount >= this.failureThreshold) {
      this.circuitOpen = true;
      console.error('[CIRCUIT-BREAKER] Circuit opened due to failures!');
    }
  }
  
  static recordSuccess(): void {
    this.failureCount = 0;
  }
}

// Layer 4: Fallback Mechanisms
class FallbackLogger {
  static emit(message: string, level: LogLevel, context?: LogContext): void {
    // Flatten nested objects to reduce deep nesting
    const flattenedOutput = this.flattenObject({
      "@timestamp": new Date().toISOString(),
      "log.level": level,
      message,
      "service.name": "authentication-service",
      "service.environment": telemetryConfig.DEPLOYMENT_ENVIRONMENT,
      ...context,
    });

    switch (level) {
      case LogLevel.ERROR:
        console.error(JSON.stringify(flattenedOutput));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(flattenedOutput));
        break;
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(flattenedOutput));
        break;
      default:
        console.log(JSON.stringify(flattenedOutput));
    }
  }

  private static flattenObject(obj: any, prefix: string = '', separator: string = '.'): Record<string, any> {
    const flattened: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        Object.assign(flattened, this.flattenObject(value, newKey, separator));
      } else {
        flattened[newKey] = value;
      }
    }
    
    return flattened;
  }
}

// Layer 5: Attribute Sanitization
class AttributeSanitizer {
  static sanitize(attributes: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(attributes)) {
      if (value === null || value === undefined) {
        continue;
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        if (value.every(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
          sanitized[key] = value;
        } else {
          sanitized[key] = JSON.stringify(value);
        }
      } else if (typeof value === 'object') {
        sanitized[key] = JSON.stringify(value);
      } else {
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }
}

// Layer 6: Provider Management
class ProviderManager {
  private static logger: api.Logger | undefined;
  private static initialized = false;
  
  static initialize(): void {
    if (this.initialized) return;
    
    try {
      const directLoggerProvider = (global as any).telemetryLoggerProvider;
      
      if (directLoggerProvider) {
        this.logger = directLoggerProvider.getLogger(
          'pvh-authentication-service', 
          telemetryConfig.SERVICE_VERSION
        );
        this.initialized = true;
        return;
      }
      
      const loggerProvider = api.logs.getLoggerProvider();
      this.logger = loggerProvider.getLogger(
        'pvh-authentication-service', 
        telemetryConfig.SERVICE_VERSION
      );
      this.initialized = true;
    } catch (error) {
      // Silent initialization failure - will use console fallback
    }
  }
  
  static getLogger(): api.Logger | undefined {
    return this.logger;
  }
  
  static isInitialized(): boolean {
    return this.initialized;
  }
  
  static reinitialize(): void {
    this.initialized = false;
    this.logger = undefined;
    this.initialize();
  }
}

// Layer 7: Error Recovery
class ErrorRecovery {
  static attempt<T>(operation: () => T, fallback: () => T): T {
    try {
      return operation();
    } catch (error) {
      CircuitBreaker.recordFailure();
      return fallback();
    }
  }
}

// Layer 8: Main Logger Class - Orchestration Layer
class BunTelemetryLogger {
  constructor() {
    this.initialize();
  }
  
  private initialize(): void {
    ProviderManager.initialize();
  }
  
  public reinitialize(): void {
    ProviderManager.reinitialize();
    
    // Signal that logger is ready with a simple console log
    FallbackLogger.emit('OpenTelemetry logger initialized and ready', LogLevel.INFO, {
      component: 'telemetry',
      event: 'logger_ready',
      success: true
    });
  }
  
  private getSeverityNumber(level: LogLevel): SeverityNumber {
    switch (level) {
      case LogLevel.DEBUG: return SeverityNumber.DEBUG;
      case LogLevel.INFO: return SeverityNumber.INFO;
      case LogLevel.WARN: return SeverityNumber.WARN;
      case LogLevel.ERROR: return SeverityNumber.ERROR;
      default: return SeverityNumber.INFO;
    }
  }
  
  private emit(message: string, level: LogLevel, context?: LogContext): void {
    // Apply trace context injection (Layer 1)
    const enrichedContext = TraceContextInjector.inject(context);
    
    // No sampling - collector will handle sampling decisions
    
    // Check circuit breaker (Layer 3)
    if (!CircuitBreaker.canProceed()) {
      FallbackLogger.emit(message, level, enrichedContext);
      return;
    }
    
    // Direct OTLP export with fallback (bypassing broken OpenTelemetry SDK)
    const shouldUseOTLP = telemetryConfig.TELEMETRY_MODE === 'otlp' || telemetryConfig.TELEMETRY_MODE === 'both';
    
    if (shouldUseOTLP) {
      // Direct OTLP export using fetch API
      this.directOTLPExport(message, level, enrichedContext)
        .then(() => CircuitBreaker.recordSuccess())
        .catch(error => {
          CircuitBreaker.recordFailure();
          console.warn(`[DIRECT-OTLP] Export failed, using console fallback:`, error.message);
        });
    }
    
    // Always emit to console in 'both' mode or when OTLP fails
    if (telemetryConfig.TELEMETRY_MODE === 'console' || telemetryConfig.TELEMETRY_MODE === 'both') {
      FallbackLogger.emit(message, level, enrichedContext);
    }
  }
  
  public debug(message: string, context?: LogContext): void {
    this.emit(message, LogLevel.DEBUG, context);
  }

  public info(message: string, context?: LogContext): void {
    this.emit(message, LogLevel.INFO, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.emit(message, LogLevel.WARN, context);
  }

  public error(message: string, context?: LogContext): void {
    this.emit(message, LogLevel.ERROR, context);
  }

  // Specialized methods for authentication service operations
  public logHttpRequest(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    this.info('HTTP request processed', {
      ...context,
      httpMethod: method,
      httpUrl: url,
      httpStatusCode: statusCode,
      duration,
      type: 'http_request'
    });
  }

  public logKongOperation(operation: string, duration: number, success: boolean, context?: LogContext): void {
    const message = success 
      ? `Kong operation completed: ${operation}` 
      : `Kong operation failed: ${operation}`;
      
    const logContext = {
      ...context,
      kong: {
        operation,
        responseTime: duration,
        success
      },
      type: 'kong_operation'
    };

    if (success) {
      this.info(message, logContext);
    } else {
      this.error(message, logContext);
    }
  }

  public logJWTOperation(operation: string, duration: number, username?: string, context?: LogContext): void {
    this.info(`JWT operation completed: ${operation}`, {
      ...context,
      jwt: {
        operation,
        duration,
        username
      },
      type: 'jwt_operation'
    });
  }

  public logAuthenticationEvent(event: string, success: boolean, context?: LogContext): void {
    const message = `Authentication event: ${event}`;
    const logContext = {
      ...context,
      authentication: {
        event,
        success
      },
      type: 'authentication_event'
    };

    if (success) {
      this.info(message, logContext);
    } else {
      this.warn(message, logContext);
    }
  }

  private async directOTLPExport(message: string, level: LogLevel, context?: LogContext): Promise<void> {
    // Flatten the context for OTLP export too
    const flattenedContext = FallbackLogger.flattenObject(context || {});
    
    const otlpPayload = {
      resourceLogs: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: telemetryConfig.SERVICE_NAME } },
            { key: 'service.version', value: { stringValue: telemetryConfig.SERVICE_VERSION } },
            { key: 'deployment.environment', value: { stringValue: telemetryConfig.DEPLOYMENT_ENVIRONMENT } },
            { key: 'runtime.name', value: { stringValue: 'bun' } }
          ]
        },
        scopeLogs: [{
          scope: { name: 'pvh-authentication-service', version: '1.0.0' },
          logRecords: [{
            timeUnixNano: String(Date.now() * 1_000_000),
            severityNumber: this.getSeverityNumber(level),
            severityText: level,
            body: { stringValue: message },
            attributes: Object.entries(flattenedContext).map(([key, value]) => ({
              key,
              value: { stringValue: String(value) }
            }))
          }]
        }]
      }]
    };
    
    const response = await fetch(telemetryConfig.LOGS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(otlpPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OTLP export failed: HTTP ${response.status} - ${errorText}`);
    }
    
    // Successfully exported to OTLP endpoint
  }

  public async flush(): Promise<void> {
    // Direct OTLP approach doesn't need explicit flushing
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Global logger instance - initialized immediately
export const telemetryLogger = new BunTelemetryLogger();

// Event listener for telemetry ready event
if (typeof globalThis !== 'undefined') {
  globalThis.addEventListener('telemetryLoggerReady', () => {
    telemetryLogger.reinitialize();
  });
}

// Convenience exports for direct function usage
export const log = (message: string, context?: LogContext) => telemetryLogger.info(message, context);
export const warn = (message: string, context?: LogContext) => telemetryLogger.warn(message, context);
export const error = (message: string, context?: LogContext) => telemetryLogger.error(message, context);
export const debug = (message: string, context?: LogContext) => telemetryLogger.debug(message, context);

// Specialized method aliases for compatibility
(telemetryLogger as any).httpRequest = telemetryLogger.logHttpRequest;
(telemetryLogger as any).kongOperation = telemetryLogger.logKongOperation;
(telemetryLogger as any).authEvent = telemetryLogger.logAuthenticationEvent;
(telemetryLogger as any).telemetryEvent = telemetryLogger.info;