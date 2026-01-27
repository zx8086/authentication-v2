# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 642.9ms | 475 | 1.0ms | 778 |

**Top 10:** `anonymous` 76.8%, `parseModule` 5.2%, `resolve` 3.0%, `recordRedisOperation` 2.3%, `(anonymous)` 2.0%, `heapStats` 0.8%, `moduleDeclarationInstantiation` 0.5%, `defineProperty` 0.3%, `forEach` 0.3%, `async createBackend` 0.2%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 76.8% | 494.2ms | 100.0% | 2.69s | `anonymous` | `[native code]` |
| 5.2% | 33.5ms | 84.0% | 540.0ms | `parseModule` | `[native code]` |
| 3.0% | 19.8ms | 3.0% | 19.8ms | `resolve` | `[native code]` |
| 2.3% | 15.0ms | 2.3% | 15.0ms | `recordRedisOperation` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/metrics.ts` |
| 2.0% | 13.1ms | 83.6% | 537.3ms | `(anonymous)` | `[native code]` |
| 0.8% | 5.1ms | 0.8% | 5.1ms | `heapStats` | `[native code]` |
| 0.5% | 3.5ms | 0.5% | 3.5ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.3% | 2.2ms | 0.3% | 2.2ms | `defineProperty` | `[native code]` |
| 0.3% | 2.1ms | 1.7% | 10.9ms | `forEach` | `[native code]` |
| 0.2% | 1.5ms | 0.2% | 1.5ms | `async createBackend` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts` |
| 0.2% | 1.4ms | 0.2% | 1.4ms | `getOneOf` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js` |
| 0.2% | 1.4ms | 0.2% | 1.4ms | `trimStart` | `[native code]` |
| 0.2% | 1.4ms | 0.2% | 1.4ms | `regExpMatchFast` | `[native code]` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `memoryUsage` | `[native code]` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `createCounter` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/Meter.js` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `monitorEventLoopDelay` | `node:perf_hooks` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `enable` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/debug/src/common.js` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@so-ric/colorspace/dist/index.cjs.js:159` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/platform/index.js` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `@lazy` | `[native code]` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `WriteStream` | `internal:fs/streams:244` |
| 0.2% | 1.2ms | 0.5% | 3.8ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:182` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `test` | `[native code]` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:115` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `__lookupGetter__` | `[native code]` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `getDelegate` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracerProvider.js` |
| 0.1% | 1.2ms | 5.9% | 38.4ms | `link` | `[native code]` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `connect` | `[native code]` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `json_parse` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/json-bigint/lib/parse.js` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:23` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `normalizeSpawnArguments` | `node:child_process:429` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js:203` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `DiagComponentLogger` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/diag/ComponentLogger.js` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `isInteger` | `[native code]` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `start` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:222` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `Function` | `[native code]` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/styles.js:91` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/ExportResult.js` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `node:fs/promises` | `node:fs/promises:69` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `getResponseSchemaForHandler` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/openapi-generator.ts` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/google-logging-utils/build/src/logging-utils.js:34` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `getTracer` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/BasicTracerProvider.js` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `node:crypto` | `node:crypto:70` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:397` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `_enum` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `assign` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/fecha/lib/fecha.umd.js` |
| 0.1% | 1.0ms | 87.2% | 561.0ms | `async (anonymous)` | `[native code]` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `clone` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/util.js:253` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js` |
| 0.1% | 1.0ms | 100.0% | 2.63s | `require` | `[native code]` |
| 0.1% | 827us | 0.1% | 827us | `BufferList` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/internal/streams/buffer_list.js` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 100.0% | 2.69s | 76.8% | 494.2ms | `anonymous` | `[native code]` |
| 100.0% | 2.64s | 0.0% | 0us | `bound require` | `[native code]` |
| 100.0% | 2.63s | 0.1% | 1.0ms | `require` | `[native code]` |
| 87.2% | 561.0ms | 0.1% | 1.0ms | `async (anonymous)` | `[native code]` |
| 84.0% | 540.0ms | 5.2% | 33.5ms | `parseModule` | `[native code]` |
| 83.6% | 537.3ms | 2.0% | 13.1ms | `(anonymous)` | `[native code]` |
| 82.6% | 531.3ms | 0.0% | 0us | `processTicksAndRejections` | `[native code]` |
| 38.5% | 247.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/index.js:19` |
| 12.1% | 78.0ms | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 9.8% | 63.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/platform/index.js:19` |
| 9.8% | 63.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/index.js:19` |
| 9.6% | 61.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/platform/node/index.js:19` |
| 8.5% | 55.1ms | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 6.6% | 42.6ms | 0.0% | 0us | `evaluate` | `[native code]` |
| 6.4% | 41.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:20` |
| 6.2% | 40.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-amqplib/build/src/index.js:19` |
| 5.9% | 38.4ms | 0.1% | 1.2ms | `link` | `[native code]` |
| 5.9% | 38.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/start.js:19` |
| 5.9% | 38.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/index.js:35` |
| 5.7% | 37.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/index.js:19` |
| 5.3% | 34.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/ConfigFactory.js:20` |
| 4.9% | 31.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/FileConfigFactory.js:22` |
| 4.7% | 30.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:64` |
| 4.7% | 30.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/platform/node/OTLPMetricExporter.js:20` |
| 4.5% | 29.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/create-logger.js:12` |
| 4.5% | 29.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston.js:42` |
| 4.5% | 29.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/index.js:19` |
| 4.5% | 29.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/detectors/index.js:19` |
| 4.5% | 29.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/index.js:33` |
| 4.0% | 25.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-amqplib/build/src/amqplib.js:20` |
| 3.9% | 25.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/index.js:3` |
| 3.8% | 24.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/platform/node/OTLPMetricExporter.js:19` |
| 3.7% | 23.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/index.js:19` |
| 3.6% | 23.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:45` |
| 3.6% | 23.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mysql2/build/src/index.js:19` |
| 3.5% | 22.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/logs/protobuf/index.js:19` |
| 3.3% | 21.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/OTLPMetricExporterBase.js:20` |
| 3.2% | 21.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mysql2/build/src/instrumentation.js:22` |
| 3.1% | 20.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/logs/protobuf/logs.js:19` |
| 3.1% | 20.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/winston-transport/build/src/index.js:19` |
| 3.1% | 19.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/detectors/GcpDetector.js:24` |
| 3.0% | 19.8ms | 3.0% | 19.8ms | `resolve` | `[native code]` |
| 3.0% | 19.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/build/src/index.js:20` |
| 2.7% | 17.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:33` |
| 2.6% | 16.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/composer.js:5` |
| 2.5% | 16.5ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 2.4% | 15.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:4` |
| 2.4% | 15.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/winston-transport/build/src/OpenTelemetryTransportV3.js:20` |
| 2.3% | 15.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/redis-instrumentation.ts:183` |
| 2.3% | 15.0ms | 2.3% | 15.0ms | `recordRedisOperation` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/metrics.ts` |
| 2.2% | 14.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/minimal.js:4` |
| 2.1% | 14.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston-transport/index.js:4` |
| 2.1% | 13.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:14` |
| 2.0% | 12.9ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/server.ts:41` |
| 1.9% | 12.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:31` |
| 1.9% | 12.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston.js:10` |
| 1.8% | 11.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-amqplib/build/src/amqplib.js:21` |
| 1.7% | 11.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/common/time.js:19` |
| 1.7% | 11.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/platform/index.js:19` |
| 1.7% | 11.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/logform/index.js:16` |
| 1.7% | 11.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/logform/colorize.js:3` |
| 1.7% | 11.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/logform/levels.js:3` |
| 1.7% | 11.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/index-minimal.js:13` |
| 1.7% | 11.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/writer.js:4` |
| 1.7% | 10.9ms | 0.3% | 2.1ms | `forEach` | `[native code]` |
| 1.6% | 10.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/exception-handler.js:12` |
| 1.6% | 10.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:22` |
| 1.6% | 10.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/index.js:19` |
| 1.5% | 10.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gaxios/build/src/index.js:31` |
| 1.5% | 10.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js:42` |
| 1.5% | 10.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/platform/node/sdk-info.js:20` |
| 1.5% | 10.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/platform/node/index.js:26` |
| 1.5% | 9.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/safe.js:9` |
| 1.5% | 9.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/index.js:24` |
| 1.4% | 9.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:31` |
| 1.4% | 9.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/platform/index.js:19` |
| 1.4% | 9.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/common/time.js:19` |
| 1.4% | 9.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/index.js:19` |
| 1.4% | 9.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/index.js:19` |
| 1.4% | 9.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/index.js:21` |
| 1.4% | 9.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/index.js:32` |
| 1.4% | 9.1ms | 0.0% | 0us | `async createKongCache` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/cache-factory.ts:14` |
| 1.4% | 9.1ms | 0.0% | 0us | `async initializeCache` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/cache-factory.ts:63` |
| 1.4% | 9.1ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/server.ts:34` |
| 1.4% | 9.1ms | 0.0% | 0us | `async createKongCache` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/cache-factory.ts:53` |
| 1.4% | 9.1ms | 0.0% | 0us | `async initializeCache` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/adapters/kong.adapter.ts:63` |
| 1.4% | 9.1ms | 0.0% | 0us | `KongAdapter` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/adapters/kong.adapter.ts:58` |
| 1.4% | 9.1ms | 0.0% | 0us | `async initializeCache` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/adapters/kong.adapter.ts:61` |
| 1.4% | 9.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/node/index.js:7` |
| 1.3% | 8.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/Document.js:8` |
| 1.3% | 8.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/export/AggregationSelector.js:20` |
| 1.3% | 8.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/export/MetricReader.js:21` |
| 1.3% | 8.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston-transport/modern.js:4` |
| 1.3% | 8.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/platform/node/index.js:28` |
| 1.2% | 7.8ms | 0.0% | 0us | `getNodeAutoInstrumentations` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:166` |
| 1.2% | 7.8ms | 0.0% | 0us | `async initializeTelemetry` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/instrumentation.ts:185` |
| 1.2% | 7.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:19` |
| 1.2% | 7.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/baggage/utils.js:19` |
| 1.2% | 7.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/index.js:19` |
| 1.2% | 7.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/aws-sdk.js:22` |
| 1.1% | 7.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:106` |
| 1.1% | 7.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/view/Aggregation.js:20` |
| 1.1% | 7.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/view/AggregationOption.js:19` |
| 1.1% | 7.5ms | 0.0% | 0us | `info` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:140` |
| 1.1% | 7.5ms | 0.0% | 0us | `async initializeCache` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/cache-factory.ts:64` |
| 1.1% | 7.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/MeterProvider.js:21` |
| 1.0% | 7.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/platform/node/sdk-info.js:20` |
| 1.0% | 6.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/index.js:19` |
| 1.0% | 6.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/forEach.js:7` |
| 1.0% | 6.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:11` |
| 1.0% | 6.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/detectors/GcpDetector.js:23` |
| 1.0% | 6.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/platform/node/OTLPMetricExporter.js:21` |
| 1.0% | 6.5ms | 0.0% | 0us | `::bunternal::` | `node:v8:55` |
| 1.0% | 6.5ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/server.ts:61` |
| 1.0% | 6.5ms | 0.0% | 0us | `initializeGCMetrics` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/gc-metrics.ts:116` |
| 1.0% | 6.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/index.js:21` |
| 1.0% | 6.5ms | 0.0% | 0us | `InstrumentationBase` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:46` |
| 1.0% | 6.5ms | 0.0% | 0us | `enable` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:218` |
| 1.0% | 6.5ms | 0.0% | 0us | `_warnOnPreloadedModules` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:111` |
| 1.0% | 6.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:37` |
| 0.9% | 6.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:36` |
| 0.9% | 6.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-http/build/src/index.js:19` |
| 0.9% | 5.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/composer.js:8` |
| 0.9% | 5.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterProviderSharedState.js:21` |
| 0.8% | 5.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:25` |
| 0.8% | 5.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:62` |
| 0.8% | 5.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/index.js:21` |
| 0.8% | 5.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/BasicTracerProvider.js:21` |
| 0.8% | 5.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/stats/si.js:22` |
| 0.8% | 5.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/metric.js:22` |
| 0.8% | 5.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/eachOfLimit.js:7` |
| 0.8% | 5.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/eachOf.js:15` |
| 0.8% | 5.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gaxios/build/src/gaxios.js:63` |
| 0.8% | 5.2ms | 0.0% | 0us | `bound resolve` | `[native code]` |
| 0.8% | 5.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:114` |
| 0.8% | 5.1ms | 0.0% | 0us | `getConfig` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/config.ts:24` |
| 0.8% | 5.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/parse.js:33` |
| 0.8% | 5.1ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:10` |
| 0.8% | 5.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/Schema.js:7` |
| 0.8% | 5.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/diag/ComponentLogger.js:19` |
| 0.8% | 5.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index-incubating.js:37` |
| 0.8% | 5.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/api/diag.js:19` |
| 0.8% | 5.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:51` |
| 0.8% | 5.1ms | 0.8% | 5.1ms | `heapStats` | `[native code]` |
| 0.7% | 5.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/node/development.js:29` |
| 0.7% | 5.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:922` |
| 0.7% | 5.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:34` |
| 0.7% | 4.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-doc.js:4` |
| 0.7% | 4.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:10` |
| 0.7% | 4.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-http/build/src/http.js:26` |
| 0.7% | 4.7ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 0.7% | 4.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js:43` |
| 0.7% | 4.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/index.js:24` |
| 0.7% | 4.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:54` |
| 0.7% | 4.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:48` |
| 0.7% | 4.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:66` |
| 0.6% | 4.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:24` |
| 0.6% | 4.2ms | 0.0% | 0us | `init` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/core.js:21` |
| 0.6% | 4.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/index.js:21` |
| 0.6% | 4.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/index.js:19` |
| 0.6% | 4.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-aws/build/src/index.js:19` |
| 0.6% | 4.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:25` |
| 0.6% | 4.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:56` |
| 0.6% | 4.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/otlp-http-export-delegate.js:20` |
| 0.6% | 4.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/index-node-http.js:21` |
| 0.6% | 4.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/modifiers/namespace-ansi.js:1` |
| 0.6% | 4.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/internal/global-utils.js:19` |
| 0.6% | 4.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:37` |
| 0.6% | 3.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:61` |
| 0.6% | 3.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston-transport/modern.js:3` |
| 0.6% | 3.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/Document.js:6` |
| 0.6% | 3.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:58` |
| 0.6% | 3.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js:41` |
| 0.6% | 3.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:44` |
| 0.6% | 3.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:47` |
| 0.5% | 3.8ms | 0.2% | 1.2ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:182` |
| 0.5% | 3.8ms | 0.0% | 0us | `async initializeTelemetry` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/instrumentation.ts:244` |
| 0.5% | 3.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/index.js:29` |
| 0.5% | 3.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-grpc/build/src/index.js:19` |
| 0.5% | 3.8ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pg/build/src/index.js:19` |
| 0.5% | 3.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:44` |
| 0.5% | 3.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:27` |
| 0.5% | 3.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:39` |
| 0.5% | 3.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-knex/build/src/index.js:19` |
| 0.5% | 3.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/trace/index.js:36` |
| 0.5% | 3.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:57` |
| 0.5% | 3.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:43` |
| 0.5% | 3.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:49` |
| 0.5% | 3.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:52` |
| 0.5% | 3.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-node.js:5` |
| 0.5% | 3.6ms | 0.0% | 0us | `initializeLogger` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:38` |
| 0.5% | 3.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/logform/timestamp.js:3` |
| 0.5% | 3.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-azure/build/src/index.js:19` |
| 0.5% | 3.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:35` |
| 0.5% | 3.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/OTLPMetricExporterBase.js:22` |
| 0.5% | 3.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/opossum/index.js:3` |
| 0.5% | 3.5ms | 0.5% | 3.5ms | `moduleDeclarationInstantiation` | `[native code]` |
| 0.5% | 3.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:29` |
| 0.5% | 3.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/json-bigint/index.js:1` |
| 0.5% | 3.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_writable.js:63` |
| 0.5% | 3.4ms | 0.0% | 0us | `node:stream` | `node:stream:2` |
| 0.5% | 3.4ms | 0.0% | 0us | `internal:stream` | `internal:stream:2` |
| 0.5% | 3.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/internal/streams/stream.js:1` |
| 0.5% | 3.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:38` |
| 0.5% | 3.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-net/build/src/index.js:19` |
| 0.5% | 3.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/RequireInTheMiddleSingleton.js:19` |
| 0.5% | 3.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:42` |
| 0.5% | 3.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:33` |
| 0.5% | 3.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-graphql/build/src/index.js:19` |
| 0.5% | 3.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-grpc/build/src/index.js:19` |
| 0.5% | 3.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-grpc/build/src/OTLPLogExporter.js:19` |
| 0.4% | 2.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:39` |
| 0.4% | 2.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:21` |
| 0.4% | 2.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-lambda/build/src/index.js:19` |
| 0.4% | 2.7ms | 0.0% | 0us | `initializeConfig` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/loader.ts:151` |
| 0.4% | 2.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:1820` |
| 0.4% | 2.7ms | 0.0% | 0us | `loadConfigFromEnv` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/loader.ts:132` |
| 0.4% | 2.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-alibaba-cloud/build/src/detectors/index.js:19` |
| 0.4% | 2.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-alibaba-cloud/build/src/index.js:19` |
| 0.4% | 2.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-router/build/src/index.js:19` |
| 0.4% | 2.7ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:55` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:26` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/winston-transport/build/src/OpenTelemetryTransportV3.js:19` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/Tracer.js:23` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/Schema.js:4` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:53` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-redis/build/src/index.js:19` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/readable.js:7` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/index.js:21` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/nodes/Pair.js:4` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-ioredis/build/src/index.js:19` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:33` |
| 0.4% | 2.6ms | 0.0% | 0us | `execFile` | `node:child_process:59` |
| 0.4% | 2.6ms | 0.0% | 0us | `async getMachineId` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-darwin.js:23` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `node:child_process:179` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/index.js:19` |
| 0.4% | 2.6ms | 0.0% | 0us | `async getMachineId` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-darwin.js:21` |
| 0.4% | 2.6ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/system/supports-colors.js:149` |
| 0.4% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:921` |
| 0.4% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-collection.js:7` |
| 0.4% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/index.js:19` |
| 0.4% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:63` |
| 0.4% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:46` |
| 0.4% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mysql/build/src/index.js:19` |
| 0.4% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/transport/http-exporter-transport.js:19` |
| 0.4% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/internal/eachOfLimit.js:19` |
| 0.4% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/systeminformation/lib/network.js:20` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mongodb/build/src/index.js:19` |
| 0.3% | 2.5ms | 0.0% | 0us | `inquire` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@protobufjs/inquire/index.js:12` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:59` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/google-logging-utils/build/src/index.js:30` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js:45` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-koa/build/src/index.js:19` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:40` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/trace/SemanticAttributes.js:24` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:25` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-node/build/src/NodeTracerProvider.js:19` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-node/build/src/index.js:19` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:50` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-oracledb/build/src/index.js:20` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pino/build/src/index.js:19` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-openai/build/src/index.js:19` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/ConfigFactory.js:19` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:21` |
| 0.3% | 2.5ms | 0.0% | 0us | `node:util` | `node:util:2` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:27` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-nestjs-core/build/src/index.js:19` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-tedious/build/src/index.js:19` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterSharedState.js:21` |
| 0.3% | 2.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/composer.js:4` |
| 0.3% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:26` |
| 0.3% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-hapi/build/src/index.js:19` |
| 0.3% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/index.js:13` |
| 0.3% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/json-bigint/lib/stringify.js:1` |
| 0.3% | 2.4ms | 0.0% | 0us | `initializeConfig` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/loader.ts:359` |
| 0.3% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-restify/build/src/index.js:19` |
| 0.3% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/ExponentialHistogram.js:23` |
| 0.3% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/exponential-histogram/mapping/getMapping.js:19` |
| 0.3% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/propagator-b3/build/src/index.js:19` |
| 0.3% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:30` |
| 0.3% | 2.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-fastify/build/src/index.js:19` |
| 0.3% | 2.3ms | 0.0% | 0us | `internal:streams/operators` | `internal:streams/operators:2` |
| 0.3% | 2.3ms | 0.0% | 0us | `internal:streams/compose` | `internal:streams/compose:2` |
| 0.3% | 2.3ms | 0.0% | 0us | `async connect` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/shared-redis-cache.ts:40` |
| 0.3% | 2.3ms | 0.0% | 0us | `async initialize` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:184` |
| 0.3% | 2.3ms | 0.0% | 0us | `internal:streams/duplex` | `internal:streams/duplex:2` |
| 0.3% | 2.3ms | 0.0% | 0us | `internal:streams/pipeline` | `internal:streams/pipeline:2` |
| 0.3% | 2.3ms | 0.0% | 0us | `async connect` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/backends/shared-redis-backend.ts:69` |
| 0.3% | 2.3ms | 0.0% | 0us | `async connect` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/backends/shared-redis-backend.ts:70` |
| 0.3% | 2.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/debug/src/index.js:9` |
| 0.3% | 2.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/require-in-the-middle/index.js:5` |
| 0.3% | 2.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mongoose/build/src/index.js:19` |
| 0.3% | 2.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index-incubating.js:38` |
| 0.3% | 2.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:23` |
| 0.3% | 2.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:24` |
| 0.3% | 2.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/logs/protobuf/logs.js:20` |
| 0.3% | 2.2ms | 0.3% | 2.2ms | `defineProperty` | `[native code]` |
| 0.3% | 2.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-kafkajs/build/src/index.js:19` |
| 0.3% | 2.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/index.js:19` |
| 0.3% | 2.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-socket.io/build/src/index.js:19` |
| 0.3% | 2.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:60` |
| 0.3% | 2.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:37` |
| 0.3% | 2.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/trace/index.js:36` |
| 0.3% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:69` |
| 0.3% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-grpc-exporter-base/build/src/index.js:19` |
| 0.3% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston.js:89` |
| 0.3% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/create-logger.js:48` |
| 0.3% | 2.1ms | 0.0% | 0us | `DerivedLogger` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/create-logger.js:44` |
| 0.3% | 2.1ms | 0.0% | 0us | `ZodNumber` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/core.js:40` |
| 0.3% | 2.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-express/build/src/index.js:19` |
| 0.3% | 1.9ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-connect/build/src/index.js:19` |
| 0.2% | 1.5ms | 0.0% | 0us | `PinoInstrumentation` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pino/build/src/instrumentation.js:32` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-proto/build/src/index.js:19` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-proto/build/src/platform/index.js:19` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-proto/build/src/platform/node/index.js:19` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/eachOf.js:7` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/stringify/stringify.js:6` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/stringify/stringifyPair.js:5` |
| 0.2% | 1.5ms | 0.0% | 0us | `async initialize` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:170` |
| 0.2% | 1.5ms | 0.2% | 1.5ms | `async createBackend` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts` |
| 0.2% | 1.5ms | 0.0% | 0us | `async initializeCache` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/cache-factory.ts:78` |
| 0.2% | 1.5ms | 0.0% | 0us | `async initialize` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:181` |
| 0.2% | 1.5ms | 0.0% | 0us | `async ensureInitialized` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:165` |
| 0.2% | 1.5ms | 0.0% | 0us | `async ensureInitialized` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:155` |
| 0.2% | 1.5ms | 0.0% | 0us | `async isHealthy` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:63` |
| 0.2% | 1.5ms | 0.0% | 0us | `async isHealthy` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:64` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-aws/build/src/detectors/index.js:21` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-nestjs-core/build/src/instrumentation.js:25` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-nestjs-core/build/src/enums/index.js:19` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/metrics/internal.js:6` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/metrics/protobuf/metrics.js:20` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/metrics/protobuf/index.js:20` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/index.js:29` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:20` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/context-utils.js:20` |
| 0.2% | 1.5ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-azure/build/src/detectors/index.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-fs/build/src/index.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:31` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-azure/build/src/detectors/AzureAppServiceDetector.js:22` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-fs/build/src/instrumentation.js:24` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:40` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:22` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/index.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-amqplib/build/src/amqplib.js:25` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pg/build/src/instrumentation.js:25` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/v1.js:10` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/index.js:61` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/index.js:30` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-ioredis/build/src/instrumentation.js:27` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/index.js:21` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/ServicesExtensions.js:11` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/detectors/GcpDetector.js:22` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-alibaba-cloud/build/src/detectors/AlibabaCloudEcsDetector.js:22` |
| 0.2% | 1.4ms | 0.0% | 0us | `node:_http_client` | `node:_http_client:8` |
| 0.2% | 1.4ms | 0.0% | 0us | `node:http` | `node:http:2` |
| 0.2% | 1.4ms | 0.0% | 0us | `node:_http_common` | `node:_http_common:2` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/node/development.js:30` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:41` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracerProvider.js:20` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:1646` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:434` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:13264` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:122` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:1648` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:13266` |
| 0.2% | 1.4ms | 0.2% | 1.4ms | `getOneOf` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mysql2/build/src/instrumentation.js:23` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/Document.js:4` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/utility.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/sampler/AlwaysOffSampler.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/Tracer.js:22` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/config.js:21` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api-logs/build/src/index.js:24` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-lambda/build/src/instrumentation.js:24` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-knex/build/src/instrumentation.js:22` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/parse/cst.js:5` |
| 0.2% | 1.4ms | 0.2% | 1.4ms | `trimStart` | `[native code]` |
| 0.2% | 1.4ms | 0.0% | 0us | `generateFastpass` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:875` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/doc.js:21` |
| 0.2% | 1.4ms | 0.0% | 0us | `write` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/doc.js:21` |
| 0.2% | 1.4ms | 0.0% | 0us | `map` | `[native code]` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/import-in-the-middle/index.js:14` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/baggage/propagation/W3CBaggagePropagator.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/index.js:24` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/FileConfigFactory.js:23` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:28` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-dns/build/src/index.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-undici/build/src/index.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-undici/build/src/undici.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/ServicesExtensions.js:5` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-generic-pool/build/src/instrumentation.js:22` |
| 0.2% | 1.4ms | 0.0% | 0us | `get` | `node:child_process:819` |
| 0.2% | 1.4ms | 0.0% | 0us | `get` | `node:child_process:793` |
| 0.2% | 1.4ms | 0.0% | 0us | `#createStdioObject` | `node:child_process:616` |
| 0.2% | 1.4ms | 0.0% | 0us | `spawn` | `node:child_process:14` |
| 0.2% | 1.4ms | 0.0% | 0us | `spawn` | `node:child_process:701` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-generic-pool/build/src/index.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:32` |
| 0.2% | 1.4ms | 0.0% | 0us | `#getBunSpawnIo` | `node:child_process:568` |
| 0.2% | 1.4ms | 0.0% | 0us | `RedisInstrumentationV4_V5` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-redis/build/src/v4-v5/instrumentation.js:33` |
| 0.2% | 1.4ms | 0.0% | 0us | `RedisInstrumentation` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-redis/build/src/redis.js:38` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:51` |
| 0.2% | 1.4ms | 0.0% | 0us | `log` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:262` |
| 0.2% | 1.4ms | 0.2% | 1.4ms | `regExpMatchFast` | `[native code]` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-cucumber/build/src/instrumentation.js:22` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-cucumber/build/src/index.js:19` |
| 0.2% | 1.4ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pino/build/src/instrumentation.js:23` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-proto/build/src/index.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-proto/build/src/platform/index.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/triple-beam/config/index.js:15` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/triple-beam/index.js:45` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston-transport/modern.js:5` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gaxios/build/src/gaxios.js:54` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:65` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/internal/eachOfLimit.js:7` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `memoryUsage` | `[native code]` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-http/build/src/utils.js:26` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_readable.js:62` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/node/development.js:1` |
| 0.2% | 1.3ms | 0.0% | 0us | `start` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:251` |
| 0.2% | 1.3ms | 0.0% | 0us | `setMeterProvider` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/instrumentation.js:63` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `createCounter` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/Meter.js` |
| 0.2% | 1.3ms | 0.0% | 0us | `_updateMetricInstruments` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-kafkajs/build/src/instrumentation.js:52` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/transport/http-transport-utils.js:4` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/context-async-hooks/build/src/index.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/context-async-hooks/build/src/AsyncHooksContextManager.js:21` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-redis/build/src/redis.js:22` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:40` |
| 0.2% | 1.3ms | 0.0% | 0us | `RuntimeNodeInstrumentation` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/instrumentation.js:37` |
| 0.2% | 1.3ms | 0.0% | 0us | `EventLoopDelayCollector` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/metrics/eventLoopDelayCollector.js:11` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `monitorEventLoopDelay` | `node:perf_hooks` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js:193` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/Span.js:22` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/Tracer.js:21` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterProviderSharedState.js:20` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:22` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-http/build/src/platform/node/index.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-http/build/src/platform/index.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-http/build/src/index.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/propagator-b3/build/src/B3Propagator.js:20` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_writable.js:75` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/internal/eachOfLimit.js:11` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/internal/iterator.js:12` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@elastic/ecs-winston-format/index.js:27` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:28` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/propagator-jaeger/build/src/index.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/index-node-http.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/instrumentation.js:20` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/metrics/eventLoopUtilizationCollector.js:21` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:31` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-node.js:6` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/index.js:23` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-scalar.js:5` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-hapi/build/src/instrumentation.js:23` |
| 0.2% | 1.3ms | 0.0% | 0us | `patchedRequire` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/require-in-the-middle/index.js:209` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-darwin.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-http/build/src/index.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-http/build/src/platform/node/index.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:24` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-http/build/src/platform/index.js:19` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/aws-sdk.js:27` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/trace/W3CTraceContextPropagator.js:21` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:59` |
| 0.2% | 1.3ms | 0.0% | 0us | `configure` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:105` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/debug/src/node.js:240` |
| 0.2% | 1.3ms | 0.0% | 0us | `setup` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/debug/src/common.js:287` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `enable` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/debug/src/common.js` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/logform/json.js:5` |
| 0.2% | 1.3ms | 0.0% | 0us | `Logger` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:42` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/yaml-1.1/omap.js:7` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/tags.js:14` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/index.js:19` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@so-ric/colorspace/dist/index.cjs.js:159` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:21` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:21` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-openai/build/src/instrumentation.js:27` |
| 0.2% | 1.3ms | 0.0% | 0us | `initializeLogger` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:49` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/index.js:16` |
| 0.2% | 1.3ms | 0.0% | 0us | `configureTransports` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:66` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/tags.js:11` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/LoggerProvider.js:25` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/configuration/convert-legacy-node-http-options.js:7` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/index-node-http.js:25` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/platform/index.js:28` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/platform/index.js` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/api/diag.js:20` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/platform/index.js:25` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/Document.js:3` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/nodes/Alias.js:3` |
| 0.2% | 1.3ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/index.js:29` |
| 0.2% | 1.3ms | 0.2% | 1.3ms | `@lazy` | `[native code]` |
| 0.2% | 1.3ms | 0.0% | 0us | `internal:util/mime` | `internal:util/mime:2` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/trace/protobuf/index.js:20` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/yaml-1.1/schema.js:10` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/trace/protobuf/trace.js:20` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/tags.js:16` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/index.js:23` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/nodes/Pair.js:5` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `WriteStream` | `internal:fs/streams:244` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/system/supports-colors.js:150` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:20` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:26` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-grpc/build/src/instrumentation.js:22` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:24` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-cassandra-driver/build/src/index.js:19` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/index.js:25` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `test` | `[native code]` |
| 0.2% | 1.2ms | 0.0% | 0us | `runChecks` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:46` |
| 0.2% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/checks.js:420` |
| 0.2% | 1.2ms | 0.0% | 0us | `DnsInstrumentation` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-dns/build/src/instrumentation.js:29` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:115` |
| 0.2% | 1.2ms | 0.0% | 0us | `internal:shared` | `internal:shared:2` |
| 0.2% | 1.2ms | 0.0% | 0us | `node:v8` | `node:v8:2` |
| 0.2% | 1.2ms | 0.2% | 1.2ms | `__lookupGetter__` | `[native code]` |
| 0.2% | 1.2ms | 0.0% | 0us | `internal:primordials` | `internal:primordials:66` |
| 0.2% | 1.2ms | 0.0% | 0us | `getGetter` | `internal:primordials:17` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-redis/build/src/redis.js:23` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/instrumentation.js:22` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/Logger.js:21` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/LoggerProvider.js:23` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-grpc/build/src/instrumentation.js:26` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-alibaba-cloud/build/src/detectors/AlibabaCloudEcsDetector.js:21` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/exponential-histogram/mapping/ExponentMapping.js:21` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/readable.js:12` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-router/build/src/instrumentation.js:26` |
| 0.1% | 1.2ms | 0.0% | 0us | `setTracerProvider` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-lambda/build/src/instrumentation.js:300` |
| 0.1% | 1.2ms | 0.0% | 0us | `start` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:198` |
| 0.1% | 1.2ms | 0.0% | 0us | `enableInstrumentations` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/autoLoaderUtils.js:29` |
| 0.1% | 1.2ms | 0.0% | 0us | `registerInstrumentations` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/autoLoader.js:33` |
| 0.1% | 1.2ms | 0.0% | 0us | `_traceForceFlush` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-lambda/build/src/instrumentation.js:308` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `getDelegate` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracerProvider.js` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:83` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mongoose/build/src/mongoose.js:24` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-dataloader/build/src/index.js:19` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:27` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/tags.js:8` |
| 0.1% | 1.2ms | 0.0% | 0us | `initializeLogger` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:37` |
| 0.1% | 1.2ms | 0.0% | 0us | `async (anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/shared-redis-cache.ts:52` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `connect` | `[native code]` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/redis-instrumentation.ts:165` |
| 0.1% | 1.2ms | 0.0% | 0us | `async (anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/shared-redis-cache.ts:40` |
| 0.1% | 1.2ms | 0.0% | 0us | `run` | `node:async_hooks:62` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterSharedState.js:24` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/ObservableRegistry.js:21` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:14` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-grpc/build/src/serverUtils.js:26` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-grpc/build/src/instrumentation.js:23` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:13` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/index.js:19` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detect-resources.js:20` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_writable.js:86` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `json_parse` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/json-bigint/lib/parse.js` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/json-bigint/index.js:11` |
| 0.1% | 1.2ms | 0.0% | 0us | `$constructor` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/core.js:55` |
| 0.1% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:953` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-socket.io/build/src/socket.io.js:22` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/common/global-error-handler.js:19` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-zipkin/build/src/index.js:21` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:26` |
| 0.1% | 1.2ms | 0.0% | 0us | `node:tls` | `node:tls:2` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-net/build/src/instrumentation.js:28` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/opossum/lib/circuit.js:5` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/common/map.js:4` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/nodes/YAMLMap.js:3` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js:198` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:31` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-grpc/build/src/index.js:19` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:23` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:29` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/winston-transport/build/src/OpenTelemetryTransportV3.js:23` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:5` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/index.js:19` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/BaseMetrics.js:21` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `normalizeSpawnArguments` | `node:child_process:429` |
| 0.1% | 1.2ms | 0.0% | 0us | `spawn` | `node:child_process:12` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-winston/build/src/index.js:19` |
| 0.1% | 1.2ms | 0.1% | 1.2ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js:203` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-restify/build/src/instrumentation.js:27` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/forwarded-parse/index.js:6` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-http/build/src/utils.js:29` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/EnvironmentConfigFactory.js:24` |
| 0.1% | 1.2ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:76` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/transport/http-transport-utils.js:8` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/v4.js:8` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/index.js:65` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/api/diag.js:76` |
| 0.1% | 1.1ms | 0.0% | 0us | `OTLPTraceExporter` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-http/build/src/platform/node/OTLPTraceExporter.js:27` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `DiagComponentLogger` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/diag/ComponentLogger.js` |
| 0.1% | 1.1ms | 0.0% | 0us | `OTLPExportDelegate` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/otlp-export-delegate.js:36` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/detectors/GcpDetector.js:28` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-kafkajs/build/src/instrumentation.js:26` |
| 0.1% | 1.1ms | 0.0% | 0us | `async initializeTelemetry` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/instrumentation.ts:127` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/metric.js:21` |
| 0.1% | 1.1ms | 0.0% | 0us | `createOtlpExportDelegate` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/otlp-export-delegate.js:113` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mysql/build/src/instrumentation.js:24` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/ServicesExtensions.js:8` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/index.js:27` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/platform/index.js:19` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-aws/build/src/detectors/index.js:25` |
| 0.1% | 1.1ms | 0.0% | 0us | `KoaInstrumentation` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-koa/build/src/instrumentation.js:30` |
| 0.1% | 1.1ms | 0.0% | 0us | `getOrCreateBreaker` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/circuit-breaker.service.ts:103` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pg/build/src/instrumentation.js:22` |
| 0.1% | 1.1ms | 0.0% | 0us | `CircuitBreaker` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/opossum/lib/circuit.js:187` |
| 0.1% | 1.1ms | 0.0% | 0us | `async wrapKongOperation` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/circuit-breaker.service.ts:168` |
| 0.1% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/server.ts:97` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `isInteger` | `[native code]` |
| 0.1% | 1.1ms | 0.0% | 0us | `async wrapKongOperation` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/circuit-breaker.service.ts:160` |
| 0.1% | 1.1ms | 0.0% | 0us | `async healthCheck` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/adapters/kong.adapter.ts:282` |
| 0.1% | 1.1ms | 0.0% | 0us | `async healthCheck` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/adapters/kong.adapter.ts:286` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/index.js:14` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `start` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:222` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-container/build/src/detectors/ContainerDetector.js:23` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-container/build/src/detectors/index.js:19` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-container/build/src/index.js:19` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/ServicesExtensions.js:6` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-net/build/src/instrumentation.js:23` |
| 0.1% | 1.1ms | 0.0% | 0us | `compile` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/doc.js:33` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `Function` | `[native code]` |
| 0.1% | 1.1ms | 0.0% | 0us | `generateFastpass` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:896` |
| 0.1% | 1.1ms | 0.0% | 0us | `internal:streams/legacy` | `internal:streams/legacy:2` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/platform/index.js:19` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/platform/node/export/BatchSpanProcessor.js:19` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/platform/node/index.js:19` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/directives.js:4` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js:37` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/styles.js:90` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-ioredis/build/src/instrumentation.js:22` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/styles.js:91` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/node/development.js:31` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-oracledb/build/src/instrumentation.js:21` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-oracledb/build/src/OracleTelemetryTraceHandler.js:23` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/ExportResult.js` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-koa/build/src/instrumentation.js:24` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/ExportResult.js:22` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:46` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:75` |
| 0.1% | 1.1ms | 0.0% | 0us | `node:fs` | `node:fs:2` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `node:fs/promises` | `node:fs/promises:69` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:41` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:42` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_writable.js:58` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/openapi-generator.ts:185` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `getResponseSchemaForHandler` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/openapi-generator.ts` |
| 0.1% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/server.ts:32` |
| 0.1% | 1.1ms | 0.0% | 0us | `registerAllRoutes` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/openapi-generator.ts:178` |
| 0.1% | 1.1ms | 0.0% | 0us | `generateResponsesForHandler` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/openapi-generator.ts:233` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-grpc/build/src/index.js:19` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:23` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/google-logging-utils/build/src/logging-utils.js:34` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/google-logging-utils/build/src/logging-utils.js:46` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/resolve-block-map.js:7` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterSharedState.js:20` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gaxios/build/src/gaxios.js:60` |
| 0.1% | 1.1ms | 0.0% | 0us | `startSpan` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:32` |
| 0.1% | 1.1ms | 0.0% | 0us | `_getTracer` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:46` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `getTracer` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/BasicTracerProvider.js` |
| 0.1% | 1.1ms | 0.0% | 0us | `instrumentRedisOperation` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/redis-instrumentation.ts:161` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/HostDetector.js:21` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/exception-handler.js:13` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `node:crypto` | `node:crypto:70` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/ServiceInstanceIdDetector.js:20` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/index.js:25` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-graphql/build/src/instrumentation.js:25` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/api/propagation.js:22` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:21` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/propagation-api.js:21` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mongoose/build/src/mongoose.js:21` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/Schema.js:6` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-hapi/build/src/instrumentation.js:25` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-hapi/build/src/utils.js:23` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js:407` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/resource/index.js:36` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:38` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/platform/node/index.js:19` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-grpc-exporter-base/build/src/configuration/convert-legacy-otlp-grpc-options.js:7` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/exception-handler.js:14` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/index.js:63` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/v3.js:8` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/Document.js:9` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:78` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-zipkin/build/src/index.js:19` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/AsyncMetricStorage.js:20` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/DeltaMetricProcessor.js:20` |
| 0.1% | 1.1ms | 0.1% | 1.1ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:397` |
| 0.1% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/loader.ts:45` |
| 0.1% | 1.1ms | 0.0% | 0us | `ZodNumberFormat` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/core.js:40` |
| 0.1% | 1.1ms | 0.0% | 0us | `_int` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/api.js:319` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:373` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-prometheus/build/src/PrometheusExporter.js:23` |
| 0.1% | 1.1ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-prometheus/build/src/index.js:19` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:88` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `_enum` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js` |
| 0.1% | 1.0ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/schemas.ts:64` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/exception-handler.js:15` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/ServicesExtensions.js:4` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/sqs.js:21` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:60` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/trace/W3CTraceContextPropagator.js:21` |
| 0.1% | 1.0ms | 0.0% | 0us | `AmqplibInstrumentation` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-amqplib/build/src/amqplib.js:32` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-bunyan/build/src/index.js:19` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:11` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-bunyan/build/src/instrumentation.js:24` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-express/build/src/instrumentation.js:21` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-proto/build/src/platform/node/index.js:19` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-proto/build/src/platform/index.js:19` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-proto/build/src/index.js:19` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:44` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/internal/wrapAsync.js:8` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/asyncify.js:12` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston.js:22` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/fecha/lib/fecha.umd.js:81` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/fecha/lib/fecha.umd.js:4` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `assign` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/fecha/lib/fecha.umd.js` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/fecha/lib/fecha.umd.js:2` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-knex/build/src/utils.js:20` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-knex/build/src/instrumentation.js:24` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:17` |
| 0.1% | 1.0ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 0.1% | 1.0ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:41` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/index-minimal.js:14` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/trace/SemanticAttributes.js:24` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mongodb/build/src/instrumentation.js:25` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/index.js:30` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:19` |
| 0.1% | 1.0ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/schemas.ts:123` |
| 0.1% | 1.0ms | 0.0% | 0us | `clone` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/util.js:251` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:365` |
| 0.1% | 1.0ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/schemas.ts:299` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `clone` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/util.js:253` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:75` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-grpc-exporter-base/build/src/configuration/convert-legacy-otlp-grpc-options.js:5` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:38` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/baggage/propagation/W3CBaggagePropagator.js:20` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:19` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston.js:182` |
| 0.1% | 1.0ms | 0.0% | 0us | `forFunctions` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/common.js:33` |
| 0.1% | 1.0ms | 0.1% | 1.0ms | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js` |
| 0.1% | 1.0ms | 0.0% | 0us | `(module)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/schemas.ts:17` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/propagator-b3/build/src/B3Propagator.js:23` |
| 0.1% | 1.0ms | 0.0% | 0us | `_number` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/api.js:302` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-memcached/build/src/instrumentation.js:21` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-memcached/build/src/index.js:19` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-fastify/build/src/instrumentation.js:27` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/modifiers/namespace-ansi.js:2` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-azure/build/src/detectors/index.js:23` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gaxios/build/src/gaxios.js:64` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/logs/internal.js:19` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/common/utils.js:20` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-graphql/build/src/instrumentation.js:22` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/MeterProvider.js:22` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/readable.js:15` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-collection.js:9` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-tedious/build/src/instrumentation.js:24` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/ExponentialHistogram.js:22` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterSharedState.js:22` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-net/build/src/instrumentation.js:27` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-express/build/src/instrumentation.js:23` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-express/build/src/utils.js:21` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/index.js:19` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/view/View.js:21` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/MeterProvider.js:23` |
| 0.1% | 1.0ms | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-nestjs-core/build/src/instrumentation.js:23` |
| 0.1% | 998us | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/otlp-network-export-delegate.js:20` |
| 0.1% | 998us | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/index.js:28` |
| 0.1% | 942us | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-connect/build/src/instrumentation.js:23` |
| 0.1% | 908us | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/index-minimal.js:16` |
| 0.1% | 845us | 0.0% | 0us | `(anonymous)` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/index.js:21` |
| 0.1% | 827us | 0.0% | 0us | `Transform` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_transform.js:95` |
| 0.1% | 827us | 0.0% | 0us | `ReadableState` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_readable.js:113` |
| 0.1% | 827us | 0.0% | 0us | `Logger` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:41` |
| 0.1% | 827us | 0.0% | 0us | `Duplex` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_duplex.js:51` |
| 0.1% | 827us | 0.1% | 827us | `BufferList` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/internal/streams/buffer_list.js` |
| 0.1% | 827us | 0.0% | 0us | `Readable` | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_readable.js:170` |

## Function Details

### `anonymous`
`[native code]` | Self: 76.8% (494.2ms) | Total: 100.0% (2.69s) | Samples: 393

**Called by:**
- `require` (2116)
- `bound require` (11)
- `bound resolve` (4)
- `(anonymous)` (4)
- `node:stream` (3)
- `internal:stream` (3)
- `(anonymous)` (2)
- `internal:streams/duplex` (2)
- `internal:streams/operators` (2)
- `internal:streams/compose` (2)
- `node:util` (2)
- `internal:streams/pipeline` (2)
- `node:_http_common` (1)
- `internal:shared` (1)
- `#getBunSpawnIo` (1)
- `node:tls` (1)
- `node:fs` (1)
- `node:v8` (1)
- `internal:streams/legacy` (1)
- `node:http` (1)
- `node:_http_client` (1)

**Calls:**
- `(anonymous)` (52)
- `(anonymous)` (51)
- `(anonymous)` (34)
- `(anonymous)` (33)
- `(anonymous)` (30)
- `(anonymous)` (29)
- `(anonymous)` (27)
- `(anonymous)` (25)
- `(anonymous)` (25)
- `(anonymous)` (25)
- `(anonymous)` (24)
- `(anonymous)` (24)
- `(anonymous)` (23)
- `(anonymous)` (21)
- `(anonymous)` (21)
- `(anonymous)` (20)
- `(anonymous)` (20)
- `(anonymous)` (19)
- `(anonymous)` (19)
- `(anonymous)` (19)
- `(anonymous)` (18)
- `(anonymous)` (17)
- `(anonymous)` (17)
- `(anonymous)` (16)
- `(anonymous)` (16)
- `(anonymous)` (14)
- `(anonymous)` (13)
- `(anonymous)` (13)
- `(anonymous)` (12)
- `(anonymous)` (12)
- `(anonymous)` (11)
- `(anonymous)` (11)
- `(anonymous)` (10)
- `(anonymous)` (10)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `node:stream` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `internal:stream` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `node:util` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `internal:streams/operators` (2)
- `internal:streams/pipeline` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `internal:streams/duplex` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `internal:streams/compose` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:primordials` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node:fs` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node:tls` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:util/mime` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node:http` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node:_http_client` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:shared` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node:fs/promises` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node:crypto` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `runChecks` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node:_http_common` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `internal:streams/legacy` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `parseModule`
`[native code]` | Self: 5.2% (33.5ms) | Total: 84.0% (540.0ms) | Samples: 10

**Called by:**
- `async (anonymous)` (414)

**Calls:**
- `(anonymous)` (199)
- `(anonymous)` (52)
- `(anonymous)` (30)
- `(anonymous)` (24)
- `(anonymous)` (23)
- `(anonymous)` (16)
- `(anonymous)` (10)
- `(anonymous)` (6)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (4)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `node:v8` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `resolve`
`[native code]` | Self: 3.0% (19.8ms) | Total: 3.0% (19.8ms) | Samples: 15

**Called by:**
- `async (anonymous)` (15)

### `recordRedisOperation`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/metrics.ts` | Self: 2.3% (15.0ms) | Total: 2.3% (15.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`[native code]` | Self: 2.0% (13.1ms) | Total: 83.6% (537.3ms) | Samples: 1

**Called by:**
- `processTicksAndRejections` (388)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `async (anonymous)` (343)
- `async asyncModuleEvaluation` (24)
- `async loadAndEvaluateModule` (14)
- `async getMachineId` (2)
- `anonymous` (2)
- `async initialize` (2)
- `requestSatisfyUtil` (1)
- `WriteStream` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `forEach` (1)

### `heapStats`
`[native code]` | Self: 0.8% (5.1ms) | Total: 0.8% (5.1ms) | Samples: 4

**Called by:**
- `::bunternal::` (4)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 0.5% (3.5ms) | Total: 0.5% (3.5ms) | Samples: 3

**Called by:**
- `link` (3)

### `defineProperty`
`[native code]` | Self: 0.3% (2.2ms) | Total: 0.3% (2.2ms) | Samples: 2

**Called by:**
- `$constructor` (1)
- `(anonymous)` (1)

### `forEach`
`[native code]` | Self: 0.3% (2.1ms) | Total: 1.7% (10.9ms) | Samples: 2

**Called by:**
- `_warnOnPreloadedModules` (5)
- `forFunctions` (1)
- `(anonymous)` (1)
- `registerAllRoutes` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (4)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `async createBackend`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts` | Self: 0.2% (1.5ms) | Total: 0.2% (1.5ms) | Samples: 1

**Called by:**
- `async initialize` (1)

### `getOneOf`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js` | Self: 0.2% (1.4ms) | Total: 0.2% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `trimStart`
`[native code]` | Self: 0.2% (1.4ms) | Total: 0.2% (1.4ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `regExpMatchFast`
`[native code]` | Self: 0.2% (1.4ms) | Total: 0.2% (1.4ms) | Samples: 1

**Called by:**
- `log` (1)

### `memoryUsage`
`[native code]` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `::bunternal::` (1)

### `createCounter`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/Meter.js` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `_updateMetricInstruments` (1)

### `monitorEventLoopDelay`
`node:perf_hooks` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `EventLoopDelayCollector` (1)

### `enable`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/debug/src/common.js` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `setup` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@so-ric/colorspace/dist/index.cjs.js:159` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/platform/index.js` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `@lazy`
`[native code]` | Self: 0.2% (1.3ms) | Total: 0.2% (1.3ms) | Samples: 1

**Called by:**
- `internal:util/mime` (1)

### `WriteStream`
`internal:fs/streams:244` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:182` | Self: 0.2% (1.2ms) | Total: 0.5% (3.8ms) | Samples: 1

**Called by:**
- `anonymous` (3)

**Calls:**
- `inquire` (2)

### `test`
`[native code]` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:115` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `forEach` (1)

### `__lookupGetter__`
`[native code]` | Self: 0.2% (1.2ms) | Total: 0.2% (1.2ms) | Samples: 1

**Called by:**
- `getGetter` (1)

### `getDelegate`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracerProvider.js` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `_traceForceFlush` (1)

### `link`
`[native code]` | Self: 0.1% (1.2ms) | Total: 5.9% (38.4ms) | Samples: 1

**Called by:**
- `link` (28)
- `linkAndEvaluateModule` (4)

**Calls:**
- `link` (28)
- `moduleDeclarationInstantiation` (3)

### `connect`
`[native code]` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `json_parse`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/json-bigint/lib/parse.js` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:23` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `normalizeSpawnArguments`
`node:child_process:429` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `spawn` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js:203` | Self: 0.1% (1.2ms) | Total: 0.1% (1.2ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `DiagComponentLogger`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/diag/ComponentLogger.js` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `isInteger`
`[native code]` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `CircuitBreaker` (1)

### `start`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:222` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `async initializeTelemetry` (1)

### `Function`
`[native code]` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `compile` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/styles.js:91` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `forEach` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/ExportResult.js` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `node:fs/promises`
`node:fs/promises:69` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `getResponseSchemaForHandler`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/openapi-generator.ts` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `generateResponsesForHandler` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/google-logging-utils/build/src/logging-utils.js:34` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `getTracer`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/BasicTracerProvider.js` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `_getTracer` (1)

### `node:crypto`
`node:crypto:70` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `anonymous` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:397` | Self: 0.1% (1.1ms) | Total: 0.1% (1.1ms) | Samples: 1

**Called by:**
- `init` (1)

### `_enum`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js` | Self: 0.1% (1.0ms) | Total: 0.1% (1.0ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `assign`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/fecha/lib/fecha.umd.js` | Self: 0.1% (1.0ms) | Total: 0.1% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `async (anonymous)`
`[native code]` | Self: 0.1% (1.0ms) | Total: 87.2% (561.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (343)
- `requestInstantiate` (1)

**Calls:**
- `parseModule` (414)
- `resolve` (15)

### `clone`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/util.js:253` | Self: 0.1% (1.0ms) | Total: 0.1% (1.0ms) | Samples: 1

**Called by:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js` | Self: 0.1% (1.0ms) | Total: 0.1% (1.0ms) | Samples: 1

**Called by:**
- `init` (1)

### `require`
`[native code]` | Self: 0.1% (1.0ms) | Total: 100.0% (2.63s) | Samples: 1

**Called by:**
- `bound require` (2116)
- `patchedRequire` (1)

**Calls:**
- `anonymous` (2116)

### `BufferList`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/internal/streams/buffer_list.js` | Self: 0.1% (827us) | Total: 0.1% (827us) | Samples: 1

**Called by:**
- `ReadableState` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston.js:42` | Self: 0.0% (0us) | Total: 4.5% (29.5ms) | Samples: 0

**Called by:**
- `parseModule` (23)

**Calls:**
- `bound require` (23)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-aws/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.6% (4.1ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `Duplex`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_duplex.js:51` | Self: 0.0% (0us) | Total: 0.1% (827us) | Samples: 0

**Called by:**
- `Transform` (1)

**Calls:**
- `Readable` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:42` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-nestjs-core/build/src/instrumentation.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/logs/protobuf/index.js:19` | Self: 0.0% (0us) | Total: 3.5% (22.7ms) | Samples: 0

**Called by:**
- `anonymous` (19)

**Calls:**
- `bound require` (19)

### `node:tls`
`node:tls:2` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-fs/build/src/instrumentation.js:24` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:56` | Self: 0.0% (0us) | Total: 0.6% (4.1ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/transport/http-transport-utils.js:8` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/platform/index.js:28` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/LoggerProvider.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:10` | Self: 0.0% (0us) | Total: 0.8% (5.1ms) | Samples: 0

**Called by:**
- `evaluate` (4)

**Calls:**
- `getConfig` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-generic-pool/build/src/instrumentation.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:88` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-amqplib/build/src/amqplib.js:21` | Self: 0.0% (0us) | Total: 1.8% (11.7ms) | Samples: 0

**Called by:**
- `anonymous` (10)

**Calls:**
- `bound require` (10)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-socket.io/build/src/socket.io.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/OTLPMetricExporterBase.js:22` | Self: 0.0% (0us) | Total: 0.5% (3.5ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pino/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/index.js:19` | Self: 0.0% (0us) | Total: 1.0% (6.9ms) | Samples: 0

**Called by:**
- `parseModule` (5)

**Calls:**
- `bound require` (5)

### `map`
`[native code]` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `write` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/index.js:21` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/require-in-the-middle/index.js:5` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/index.js:19` | Self: 0.0% (0us) | Total: 0.6% (4.2ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/build/src/index.js:20` | Self: 0.0% (0us) | Total: 3.0% (19.8ms) | Samples: 0

**Called by:**
- `anonymous` (16)

**Calls:**
- `bound require` (16)

### `async initialize`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:184` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `async connect` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/forEach.js:7` | Self: 0.0% (0us) | Total: 1.0% (6.8ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `internal:primordials`
`internal:primordials:66` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `getGetter` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/index-node-http.js:21` | Self: 0.0% (0us) | Total: 0.6% (4.0ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-container/build/src/detectors/ContainerDetector.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `RuntimeNodeInstrumentation`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/instrumentation.js:37` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `getNodeAutoInstrumentations` (1)

**Calls:**
- `EventLoopDelayCollector` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/trace/SemanticAttributes.js:24` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (1)

**Calls:**
- `async (anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/index.js:19` | Self: 0.0% (0us) | Total: 9.8% (63.0ms) | Samples: 0

**Called by:**
- `parseModule` (52)

**Calls:**
- `bound require` (52)

### `loadConfigFromEnv`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/loader.ts:132` | Self: 0.0% (0us) | Total: 0.4% (2.7ms) | Samples: 0

**Called by:**
- `initializeConfig` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/index.js:14` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:43` | Self: 0.0% (0us) | Total: 0.5% (3.6ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-azure/build/src/detectors/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/index-minimal.js:13` | Self: 0.0% (0us) | Total: 1.7% (11.1ms) | Samples: 0

**Called by:**
- `anonymous` (9)

**Calls:**
- `bound require` (9)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/logs/internal.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:24` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-oracledb/build/src/instrumentation.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/readable.js:15` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/asyncify.js:12` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/detectors/GcpDetector.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/minimal.js:4` | Self: 0.0% (0us) | Total: 2.2% (14.3ms) | Samples: 0

**Called by:**
- `anonymous` (12)

**Calls:**
- `bound require` (12)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-http/build/src/platform/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/baggage/utils.js:19` | Self: 0.0% (0us) | Total: 1.2% (7.7ms) | Samples: 0

**Called by:**
- `anonymous` (6)

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/api/diag.js:19` | Self: 0.0% (0us) | Total: 0.8% (5.1ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-winston/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/stringify/stringify.js:6` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/server.ts:41` | Self: 0.0% (0us) | Total: 2.0% (12.9ms) | Samples: 0

**Called by:**
- `evaluate` (10)

**Calls:**
- `async initializeTelemetry` (6)
- `async initializeTelemetry` (3)
- `async initializeTelemetry` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/trace/protobuf/trace.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:53` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/metrics/eventLoopUtilizationCollector.js:21` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async initializeCache`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/cache-factory.ts:63` | Self: 0.0% (0us) | Total: 1.4% (9.1ms) | Samples: 0

**Called by:**
- `async createKongCache` (7)

**Calls:**
- `async initializeCache` (6)
- `async initializeCache` (1)

### `async initializeTelemetry`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/instrumentation.ts:127` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `OTLPTraceExporter` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/fecha/lib/fecha.umd.js:4` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/ExponentialHistogram.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/nodes/Pair.js:4` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/platform/node/OTLPMetricExporter.js:19` | Self: 0.0% (0us) | Total: 3.8% (24.8ms) | Samples: 0

**Called by:**
- `anonymous` (21)

**Calls:**
- `bound require` (21)

### `ZodNumber`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/core.js:40` | Self: 0.0% (0us) | Total: 0.3% (2.1ms) | Samples: 0

**Called by:**
- `clone` (1)
- `_number` (1)

**Calls:**
- `init` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:26` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/Document.js:8` | Self: 0.0% (0us) | Total: 1.3% (8.9ms) | Samples: 0

**Called by:**
- `anonymous` (7)

**Calls:**
- `bound require` (7)

### `node:_http_client`
`node:_http_client:8` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `configureTransports`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:66` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `initializeLogger` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/FileConfigFactory.js:23` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/DeltaMetricProcessor.js:20` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/Tracer.js:23` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-express/build/src/instrumentation.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async isHealthy`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:63` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `async initializeCache` (1)

**Calls:**
- `async isHealthy` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/json-bigint/index.js:11` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `json_parse` (1)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/server.ts:34` | Self: 0.0% (0us) | Total: 1.4% (9.1ms) | Samples: 0

**Called by:**
- `evaluate` (7)

**Calls:**
- `KongAdapter` (7)

### `ZodNumberFormat`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/core.js:40` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `_int` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:44` | Self: 0.0% (0us) | Total: 0.6% (3.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `getConfig`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/config.ts:24` | Self: 0.0% (0us) | Total: 0.8% (5.1ms) | Samples: 0

**Called by:**
- `(module)` (4)

**Calls:**
- `initializeConfig` (2)
- `initializeConfig` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:60` | Self: 0.0% (0us) | Total: 0.3% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/view/AggregationOption.js:19` | Self: 0.0% (0us) | Total: 1.1% (7.6ms) | Samples: 0

**Called by:**
- `anonymous` (6)

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:46` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:41` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-memcached/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/metric.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/node/development.js:31` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-zipkin/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-cassandra-driver/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-lambda/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.7ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_writable.js:58` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@elastic/ecs-winston-format/index.js:27` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/transport/http-transport-utils.js:4` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:38` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/index-minimal.js:14` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-http/build/src/platform/node/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `getOrCreateBreaker`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/circuit-breaker.service.ts:103` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `async wrapKongOperation` (1)

**Calls:**
- `CircuitBreaker` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:27` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:24` | Self: 0.0% (0us) | Total: 0.6% (4.4ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/api/diag.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-express/build/src/utils.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-proto/build/src/platform/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/index.js:21` | Self: 0.0% (0us) | Total: 1.0% (6.5ms) | Samples: 0

**Called by:**
- `parseModule` (5)

**Calls:**
- `bound require` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-router/build/src/instrumentation.js:26` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/debug/src/index.js:9` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/platform/node/index.js:28` | Self: 0.0% (0us) | Total: 1.3% (8.4ms) | Samples: 0

**Called by:**
- `anonymous` (7)

**Calls:**
- `bound require` (7)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/instrumentation.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/platform/node/OTLPMetricExporter.js:20` | Self: 0.0% (0us) | Total: 4.7% (30.3ms) | Samples: 0

**Called by:**
- `anonymous` (25)

**Calls:**
- `bound require` (25)

### `get`
`node:child_process:819` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `spawn` (1)

**Calls:**
- `#createStdioObject` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-alibaba-cloud/build/src/detectors/AlibabaCloudEcsDetector.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-koa/build/src/instrumentation.js:24` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:434` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/index.js:65` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/redis-instrumentation.ts:165` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `run` (1)

**Calls:**
- `async (anonymous)` (1)

### `start`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:251` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `async initializeTelemetry` (1)

**Calls:**
- `setMeterProvider` (1)

### `internal:streams/compose`
`internal:streams/compose:2` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-http/build/src/http.js:26` | Self: 0.0% (0us) | Total: 0.7% (4.9ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/openapi-generator.ts:185` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `forEach` (1)

**Calls:**
- `generateResponsesForHandler` (1)

### `bound require`
`[native code]` | Self: 0.0% (0us) | Total: 100.0% (2.64s) | Samples: 0

**Called by:**
- `(anonymous)` (199)
- `(anonymous)` (52)
- `(anonymous)` (52)
- `(anonymous)` (51)
- `(anonymous)` (34)
- `(anonymous)` (33)
- `(anonymous)` (30)
- `(anonymous)` (30)
- `(anonymous)` (29)
- `(anonymous)` (27)
- `(anonymous)` (25)
- `(anonymous)` (25)
- `(anonymous)` (25)
- `(anonymous)` (24)
- `(anonymous)` (24)
- `(anonymous)` (24)
- `(anonymous)` (23)
- `(anonymous)` (23)
- `(anonymous)` (21)
- `(anonymous)` (21)
- `(anonymous)` (20)
- `(anonymous)` (20)
- `(anonymous)` (19)
- `(anonymous)` (19)
- `(anonymous)` (19)
- `(anonymous)` (18)
- `(anonymous)` (17)
- `(anonymous)` (17)
- `(anonymous)` (16)
- `(anonymous)` (16)
- `(anonymous)` (16)
- `(anonymous)` (14)
- `(anonymous)` (13)
- `(anonymous)` (13)
- `(anonymous)` (12)
- `(anonymous)` (12)
- `(anonymous)` (11)
- `(anonymous)` (11)
- `(anonymous)` (10)
- `(anonymous)` (10)
- `(anonymous)` (10)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (9)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (8)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (7)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (6)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (5)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (4)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `initializeLogger` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `inquire` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (2)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `configureTransports` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `configure` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `initializeLogger` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

**Calls:**
- `require` (2116)
- `anonymous` (11)
- `patchedRequire` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-grpc/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/internal/eachOfLimit.js:7` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async (anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/shared-redis-cache.ts:40` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `async (anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/ConfigFactory.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/common/global-error-handler.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/json-bigint/lib/stringify.js:1` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `getGetter`
`internal:primordials:17` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `internal:primordials` (1)

**Calls:**
- `__lookupGetter__` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/FileConfigFactory.js:22` | Self: 0.0% (0us) | Total: 4.9% (31.6ms) | Samples: 0

**Called by:**
- `anonymous` (25)

**Calls:**
- `bound require` (25)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 0.7% (4.7ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (4)

**Calls:**
- `link` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/platform/node/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/create-logger.js:48` | Self: 0.0% (0us) | Total: 0.3% (2.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `DerivedLogger` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/Schema.js:7` | Self: 0.0% (0us) | Total: 0.8% (5.1ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `node:stream`
`node:stream:2` | Self: 0.0% (0us) | Total: 0.5% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-container/build/src/detectors/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/index.js:19` | Self: 0.0% (0us) | Total: 1.4% (9.4ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-hapi/build/src/instrumentation.js:25` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/system/supports-colors.js:150` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:31` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:51` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:32` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-kafkajs/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/detectors/GcpDetector.js:24` | Self: 0.0% (0us) | Total: 3.1% (19.9ms) | Samples: 0

**Called by:**
- `anonymous` (16)

**Calls:**
- `bound require` (16)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/context-async-hooks/build/src/AsyncHooksContextManager.js:21` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/logs/protobuf/logs.js:20` | Self: 0.0% (0us) | Total: 0.3% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:66` | Self: 0.0% (0us) | Total: 0.7% (4.6ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/api/diag.js:76` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `OTLPExportDelegate` (1)

**Calls:**
- `DiagComponentLogger` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:75` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/index.js:23` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `run`
`node:async_hooks:62` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `async connect` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-oracledb/build/src/index.js:20` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/index.js:30` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/utility.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `log`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:262` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `info` (1)

**Calls:**
- `regExpMatchFast` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:33` | Self: 0.0% (0us) | Total: 2.7% (17.8ms) | Samples: 0

**Called by:**
- `anonymous` (14)

**Calls:**
- `bound require` (14)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/internal/iterator.js:12` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/ExponentialHistogram.js:23` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `initializeGCMetrics`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/gc-metrics.ts:116` | Self: 0.0% (0us) | Total: 1.0% (6.5ms) | Samples: 0

**Called by:**
- `(module)` (5)

**Calls:**
- `::bunternal::` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/index.js:19` | Self: 0.0% (0us) | Total: 4.5% (29.4ms) | Samples: 0

**Called by:**
- `anonymous` (24)

**Calls:**
- `bound require` (24)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/index.js:30` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `requestInstantiate` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:106` | Self: 0.0% (0us) | Total: 1.1% (7.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)
- `(anonymous)` (2)
- `anonymous` (2)

**Calls:**
- `(anonymous)` (3)
- `(anonymous)` (2)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/propagation-api.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/styles.js:90` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `forEach` (1)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/server.ts:61` | Self: 0.0% (0us) | Total: 1.0% (6.5ms) | Samples: 0

**Called by:**
- `evaluate` (5)

**Calls:**
- `initializeGCMetrics` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:76` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterProviderSharedState.js:21` | Self: 0.0% (0us) | Total: 0.9% (5.9ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:31` | Self: 0.0% (0us) | Total: 1.4% (9.5ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mongoose/build/src/mongoose.js:24` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-http/build/src/platform/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:42` | Self: 0.0% (0us) | Total: 0.5% (3.3ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:65` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-express/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.1ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-net/build/src/instrumentation.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:13264` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/Schema.js:6` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/BasicTracerProvider.js:21` | Self: 0.0% (0us) | Total: 0.8% (5.4ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `internal:util/mime`
`internal:util/mime:2` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `@lazy` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/MeterProvider.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/winston-transport/build/src/OpenTelemetryTransportV3.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `spawn`
`node:child_process:14` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `execFile` (1)

**Calls:**
- `spawn` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index-incubating.js:37` | Self: 0.0% (0us) | Total: 0.8% (5.1ms) | Samples: 0

**Called by:**
- `parseModule` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/node/development.js:1` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/internal/streams/stream.js:1` | Self: 0.0% (0us) | Total: 0.5% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston-transport/modern.js:3` | Self: 0.0% (0us) | Total: 0.6% (3.9ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/winston-transport/build/src/index.js:19` | Self: 0.0% (0us) | Total: 3.1% (20.3ms) | Samples: 0

**Called by:**
- `parseModule` (16)

**Calls:**
- `bound require` (16)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/nodes/YAMLMap.js:3` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston-transport/index.js:4` | Self: 0.0% (0us) | Total: 2.1% (14.0ms) | Samples: 0

**Called by:**
- `anonymous` (11)

**Calls:**
- `bound require` (11)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:13266` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `clone`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/util.js:251` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodNumber` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/config.js:21` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/platform/node/index.js:26` | Self: 0.0% (0us) | Total: 1.5% (10.2ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_writable.js:75` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `InstrumentationBase`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:46` | Self: 0.0% (0us) | Total: 1.0% (6.5ms) | Samples: 0

**Called by:**
- `DnsInstrumentation` (1)
- `RedisInstrumentationV4_V5` (1)
- `KoaInstrumentation` (1)
- `PinoInstrumentation` (1)
- `AmqplibInstrumentation` (1)

**Calls:**
- `enable` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/export/AggregationSelector.js:20` | Self: 0.0% (0us) | Total: 1.3% (8.7ms) | Samples: 0

**Called by:**
- `anonymous` (7)

**Calls:**
- `bound require` (7)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/opossum/lib/circuit.js:5` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/winston-transport/build/src/OpenTelemetryTransportV3.js:20` | Self: 0.0% (0us) | Total: 2.4% (15.4ms) | Samples: 0

**Called by:**
- `anonymous` (12)

**Calls:**
- `bound require` (12)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-collection.js:9` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `setMeterProvider`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/instrumentation.js:63` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `start` (1)

**Calls:**
- `_updateMetricInstruments` (1)

### `internal:stream`
`internal:stream:2` | Self: 0.0% (0us) | Total: 0.5% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `anonymous` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-grpc/build/src/instrumentation.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/detectors/GcpDetector.js:28` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/index.js:13` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `async initializeCache`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/adapters/kong.adapter.ts:63` | Self: 0.0% (0us) | Total: 1.4% (9.1ms) | Samples: 0

**Called by:**
- `async initializeCache` (7)

**Calls:**
- `async createKongCache` (7)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/ServicesExtensions.js:11` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/logform/colorize.js:3` | Self: 0.0% (0us) | Total: 1.7% (11.2ms) | Samples: 0

**Called by:**
- `anonymous` (9)

**Calls:**
- `bound require` (9)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pg/build/src/instrumentation.js:25` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-azure/build/src/detectors/index.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `execFile`
`node:child_process:59` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `spawn` (1)
- `spawn` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/v3.js:8` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-proto/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/google-logging-utils/build/src/logging-utils.js:46` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mysql2/build/src/instrumentation.js:22` | Self: 0.0% (0us) | Total: 3.2% (21.1ms) | Samples: 0

**Called by:**
- `anonymous` (17)

**Calls:**
- `bound require` (17)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:59` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-amqplib/build/src/amqplib.js:20` | Self: 0.0% (0us) | Total: 4.0% (25.9ms) | Samples: 0

**Called by:**
- `anonymous` (21)

**Calls:**
- `bound require` (21)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js:43` | Self: 0.0% (0us) | Total: 0.7% (4.7ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/platform/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/view/View.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-alibaba-cloud/build/src/detectors/index.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.7ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:22` | Self: 0.0% (0us) | Total: 1.6% (10.4ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:50` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/index-minimal.js:16` | Self: 0.0% (0us) | Total: 0.1% (908us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-amqplib/build/src/index.js:19` | Self: 0.0% (0us) | Total: 6.2% (40.3ms) | Samples: 0

**Called by:**
- `anonymous` (33)

**Calls:**
- `bound require` (33)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `defineProperty` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/common/time.js:19` | Self: 0.0% (0us) | Total: 1.4% (9.5ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/baggage/propagation/W3CBaggagePropagator.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/platform/index.js:19` | Self: 0.0% (0us) | Total: 1.7% (11.3ms) | Samples: 0

**Called by:**
- `anonymous` (9)

**Calls:**
- `bound require` (9)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/Schema.js:4` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/server.ts:32` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `registerAllRoutes` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-dataloader/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-socket.io/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/ConfigFactory.js:20` | Self: 0.0% (0us) | Total: 5.3% (34.5ms) | Samples: 0

**Called by:**
- `anonymous` (27)

**Calls:**
- `bound require` (27)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:922` | Self: 0.0% (0us) | Total: 0.7% (5.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (3)
- `anonymous` (1)

**Calls:**
- `anonymous` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pg/build/src/instrumentation.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mysql2/build/src/index.js:19` | Self: 0.0% (0us) | Total: 3.6% (23.5ms) | Samples: 0

**Called by:**
- `anonymous` (19)

**Calls:**
- `bound require` (19)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:1820` | Self: 0.0% (0us) | Total: 0.4% (2.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/ObservableRegistry.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-http/build/src/utils.js:26` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/index.js:25` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracerProvider.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/index.js:32` | Self: 0.0% (0us) | Total: 1.4% (9.3ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:13` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-redis/build/src/redis.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:11` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `node:http`
`node:http:2` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/index.js:33` | Self: 0.0% (0us) | Total: 4.5% (29.4ms) | Samples: 0

**Called by:**
- `parseModule` (24)

**Calls:**
- `bound require` (24)

### `internal:streams/pipeline`
`internal:streams/pipeline:2` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/propagator-b3/build/src/B3Propagator.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/exponential-histogram/mapping/ExponentMapping.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `initializeLogger`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:49` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `info` (1)

**Calls:**
- `configureTransports` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:44` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-http/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `#createStdioObject`
`node:child_process:616` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `get` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/ServiceInstanceIdDetector.js:20` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-bunyan/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:40` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/Span.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gaxios/build/src/gaxios.js:63` | Self: 0.0% (0us) | Total: 0.8% (5.2ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/OTLPMetricExporterBase.js:20` | Self: 0.0% (0us) | Total: 3.3% (21.2ms) | Samples: 0

**Called by:**
- `anonymous` (18)

**Calls:**
- `bound require` (18)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/tags.js:14` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/platform/index.js:25` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/parse.js:33` | Self: 0.0% (0us) | Total: 0.8% (5.1ms) | Samples: 0

**Called by:**
- `loadConfigFromEnv` (2)
- `initializeConfig` (2)

**Calls:**
- `(anonymous)` (2)
- `(anonymous)` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/winston-transport/build/src/OpenTelemetryTransportV3.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/detectors/GcpDetector.js:23` | Self: 0.0% (0us) | Total: 1.0% (6.8ms) | Samples: 0

**Called by:**
- `anonymous` (6)

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:57` | Self: 0.0% (0us) | Total: 0.5% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-node.js:5` | Self: 0.0% (0us) | Total: 0.5% (3.6ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/yaml-1.1/schema.js:10` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/sqs.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-http/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/index.js:3` | Self: 0.0% (0us) | Total: 3.9% (25.2ms) | Samples: 0

**Called by:**
- `anonymous` (20)

**Calls:**
- `bound require` (20)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/parse/cst.js:5` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/aws-sdk.js:27` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/index.js:19` | Self: 0.0% (0us) | Total: 38.5% (247.5ms) | Samples: 0

**Called by:**
- `parseModule` (199)

**Calls:**
- `bound require` (199)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-bunyan/build/src/instrumentation.js:24` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/index.js:23` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async initializeCache`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/adapters/kong.adapter.ts:61` | Self: 0.0% (0us) | Total: 1.4% (9.1ms) | Samples: 0

**Called by:**
- `KongAdapter` (7)

**Calls:**
- `async initializeCache` (7)

### `(anonymous)`
`node:child_process:179` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `async getMachineId` (2)

**Calls:**
- `execFile` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/logform/json.js:5` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/index.js:21` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/index.js:35` | Self: 0.0% (0us) | Total: 5.9% (38.3ms) | Samples: 0

**Called by:**
- `parseModule` (30)

**Calls:**
- `bound require` (30)

### `RedisInstrumentation`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-redis/build/src/redis.js:38` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `getNodeAutoInstrumentations` (1)

**Calls:**
- `RedisInstrumentationV4_V5` (1)

### `async initializeCache`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/cache-factory.ts:64` | Self: 0.0% (0us) | Total: 1.1% (7.5ms) | Samples: 0

**Called by:**
- `async initializeCache` (6)

**Calls:**
- `info` (6)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/redis-instrumentation.ts:183` | Self: 0.0% (0us) | Total: 2.3% (15.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `recordRedisOperation` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:48` | Self: 0.0% (0us) | Total: 0.7% (4.6ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-nestjs-core/build/src/enums/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_writable.js:63` | Self: 0.0% (0us) | Total: 0.5% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/opossum/index.js:3` | Self: 0.0% (0us) | Total: 0.5% (3.5ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `bound require` (2)

### `node:v8`
`node:v8:2` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/Tracer.js:21` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/modifiers/namespace-ansi.js:2` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/internal/eachOfLimit.js:11` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/system/supports-colors.js:149` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/index.js:24` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gaxios/build/src/index.js:31` | Self: 0.0% (0us) | Total: 1.5% (10.2ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/schemas.ts:123` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `clone` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-restify/build/src/instrumentation.js:27` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:5` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/start.js:19` | Self: 0.0% (0us) | Total: 5.9% (38.3ms) | Samples: 0

**Called by:**
- `anonymous` (30)

**Calls:**
- `bound require` (30)

### `ReadableState`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_readable.js:113` | Self: 0.0% (0us) | Total: 0.1% (827us) | Samples: 0

**Called by:**
- `Readable` (1)

**Calls:**
- `BufferList` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-openai/build/src/instrumentation.js:27` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `DerivedLogger`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/create-logger.js:44` | Self: 0.0% (0us) | Total: 0.3% (2.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `Logger` (1)
- `Logger` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 6.6% (42.6ms) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (24)
- `moduleEvaluation` (10)

**Calls:**
- `(module)` (10)
- `(module)` (7)
- `(module)` (5)
- `(module)` (4)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)
- `(module)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/AsyncMetricStorage.js:20` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `spawn`
`node:child_process:12` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `execFile` (1)

**Calls:**
- `normalizeSpawnArguments` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-grpc-exporter-base/build/src/configuration/convert-legacy-otlp-grpc-options.js:7` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/schemas.ts:64` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `_enum` (1)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 12.1% (78.0ms) | Samples: 0

**Called by:**
- `async asyncModuleEvaluation` (30)
- `(anonymous)` (24)
- `async loadAndEvaluateModule` (10)

**Calls:**
- `async asyncModuleEvaluation` (30)
- `evaluate` (24)
- `moduleEvaluation` (10)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/v4.js:8` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/google-logging-utils/build/src/index.js:30` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `initializeLogger`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:37` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `info` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/server.ts:97` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `async healthCheck` (1)

### `async initializeTelemetry`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/instrumentation.ts:244` | Self: 0.0% (0us) | Total: 0.5% (3.8ms) | Samples: 0

**Called by:**
- `(module)` (3)

**Calls:**
- `start` (1)
- `start` (1)
- `start` (1)

### `async connect`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/backends/shared-redis-backend.ts:69` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `async initialize` (2)

**Calls:**
- `async connect` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/otlp-network-export-delegate.js:20` | Self: 0.0% (0us) | Total: 0.1% (998us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/eachOf.js:7` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js:193` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `_int`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/api.js:319` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `ZodNumberFormat` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/trace/index.js:36` | Self: 0.0% (0us) | Total: 0.5% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `_traceForceFlush`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-lambda/build/src/instrumentation.js:308` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `setTracerProvider` (1)

**Calls:**
- `getDelegate` (1)

### `initializeConfig`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/loader.ts:359` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `getConfig` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:10` | Self: 0.0% (0us) | Total: 0.7% (4.9ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-http/build/src/utils.js:29` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:23` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-grpc/build/src/instrumentation.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/index.js:24` | Self: 0.0% (0us) | Total: 0.7% (4.7ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-aws/build/src/detectors/index.js:25` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `startSpan`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:32` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `instrumentRedisOperation` (1)

**Calls:**
- `_getTracer` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/HostDetector.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:27` | Self: 0.0% (0us) | Total: 0.5% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/logform/timestamp.js:3` | Self: 0.0% (0us) | Total: 0.5% (3.6ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:83` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/stringify/stringifyPair.js:5` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/tags.js:16` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/triple-beam/config/index.js:15` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `createOtlpExportDelegate`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/otlp-export-delegate.js:113` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `OTLPTraceExporter` (1)

**Calls:**
- `OTLPExportDelegate` (1)

### `async createKongCache`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/cache-factory.ts:53` | Self: 0.0% (0us) | Total: 1.4% (9.1ms) | Samples: 0

**Called by:**
- `async createKongCache` (7)

**Calls:**
- `async initializeCache` (7)

### `instrumentRedisOperation`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/redis-instrumentation.ts:161` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `async connect` (1)

**Calls:**
- `startSpan` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/common/map.js:4` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:373` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `_int` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:921` | Self: 0.0% (0us) | Total: 0.4% (2.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `generateFastpass` (1)
- `generateFastpass` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:1646` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `generateResponsesForHandler`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/openapi-generator.ts:233` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `getResponseSchemaForHandler` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/trace/SemanticAttributes.js:24` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/index.js:29` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/context-async-hooks/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-aws/build/src/detectors/index.js:21` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:44` | Self: 0.0% (0us) | Total: 0.5% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:21` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async getMachineId`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-darwin.js:21` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `async getMachineId` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_writable.js:86` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/LoggerProvider.js:25` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-doc.js:4` | Self: 0.0% (0us) | Total: 0.7% (4.9ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterSharedState.js:20` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `internal:streams/duplex`
`internal:streams/duplex:2` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-tedious/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/MeterProvider.js:21` | Self: 0.0% (0us) | Total: 1.1% (7.2ms) | Samples: 0

**Called by:**
- `anonymous` (6)

**Calls:**
- `bound require` (6)

### `internal:streams/legacy`
`internal:streams/legacy:2` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `start`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:198` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `async initializeTelemetry` (1)

**Calls:**
- `registerInstrumentations` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/MeterProvider.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-undici/build/src/undici.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:29` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/index.js:21` | Self: 0.0% (0us) | Total: 0.8% (5.5ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston-transport/modern.js:5` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-amqplib/build/src/amqplib.js:25` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/RequireInTheMiddleSingleton.js:19` | Self: 0.0% (0us) | Total: 0.5% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/baggage/propagation/W3CBaggagePropagator.js:20` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `initializeConfig`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/loader.ts:151` | Self: 0.0% (0us) | Total: 0.4% (2.7ms) | Samples: 0

**Called by:**
- `getConfig` (2)

**Calls:**
- `loadConfigFromEnv` (2)

### `get`
`node:child_process:793` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `#createStdioObject` (1)

**Calls:**
- `#getBunSpawnIo` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:37` | Self: 0.0% (0us) | Total: 0.3% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:25` | Self: 0.0% (0us) | Total: 0.6% (4.1ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterSharedState.js:21` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `enable`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:218` | Self: 0.0% (0us) | Total: 1.0% (6.5ms) | Samples: 0

**Called by:**
- `InstrumentationBase` (5)

**Calls:**
- `_warnOnPreloadedModules` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-restify/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `$constructor`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/core.js:55` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `defineProperty` (1)

### `_warnOnPreloadedModules`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:111` | Self: 0.0% (0us) | Total: 1.0% (6.5ms) | Samples: 0

**Called by:**
- `enable` (5)

**Calls:**
- `forEach` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-kafkajs/build/src/instrumentation.js:26` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/schemas.ts:17` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `_number` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/ServicesExtensions.js:6` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-dns/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index-incubating.js:38` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/logform/levels.js:3` | Self: 0.0% (0us) | Total: 1.7% (11.2ms) | Samples: 0

**Called by:**
- `anonymous` (9)

**Calls:**
- `bound require` (9)

### `Readable`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_readable.js:170` | Self: 0.0% (0us) | Total: 0.1% (827us) | Samples: 0

**Called by:**
- `Duplex` (1)

**Calls:**
- `ReadableState` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:114` | Self: 0.0% (0us) | Total: 0.8% (5.2ms) | Samples: 0

**Called by:**
- `forEach` (4)

**Calls:**
- `bound resolve` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:26` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/systeminformation/lib/network.js:20` | Self: 0.0% (0us) | Total: 0.4% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-router/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.7ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `OTLPExportDelegate`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/otlp-export-delegate.js:36` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `createOtlpExportDelegate` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/Document.js:9` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:17` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:69` | Self: 0.0% (0us) | Total: 0.3% (2.1ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-node.js:6` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/platform/node/sdk-info.js:20` | Self: 0.0% (0us) | Total: 1.0% (7.0ms) | Samples: 0

**Called by:**
- `anonymous` (6)

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:46` | Self: 0.0% (0us) | Total: 0.4% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/Document.js:3` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:60` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/node/index.js:7` | Self: 0.0% (0us) | Total: 1.4% (9.0ms) | Samples: 0

**Called by:**
- `anonymous` (7)

**Calls:**
- `bound require` (7)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mysql/build/src/instrumentation.js:24` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/platform/node/sdk-info.js:20` | Self: 0.0% (0us) | Total: 1.5% (10.2ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mongodb/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-azure/build/src/detectors/AzureAppServiceDetector.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:31` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-tedious/build/src/instrumentation.js:24` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-zipkin/build/src/index.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/resolve-block-map.js:7` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:40` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/index.js:29` | Self: 0.0% (0us) | Total: 0.5% (3.8ms) | Samples: 0

**Called by:**
- `parseModule` (3)

**Calls:**
- `bound require` (3)

### `async (anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/shared-redis-cache.ts:52` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `async (anonymous)` (1)

**Calls:**
- `connect` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-nestjs-core/build/src/instrumentation.js:25` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/index.js:28` | Self: 0.0% (0us) | Total: 0.1% (998us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `registerInstrumentations`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/autoLoader.js:33` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `start` (1)

**Calls:**
- `enableInstrumentations` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-grpc-exporter-base/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.1ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/index.js:19` | Self: 0.0% (0us) | Total: 1.4% (9.4ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-grpc/build/src/OTLPLogExporter.js:19` | Self: 0.0% (0us) | Total: 0.5% (3.2ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/resource/index.js:36` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-net/build/src/instrumentation.js:28` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:38` | Self: 0.0% (0us) | Total: 0.5% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-knex/build/src/instrumentation.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-prometheus/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async healthCheck`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/adapters/kong.adapter.ts:282` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `async healthCheck` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/json-bigint/index.js:1` | Self: 0.0% (0us) | Total: 0.5% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-openai/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:51` | Self: 0.0% (0us) | Total: 0.8% (5.1ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:41` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:37` | Self: 0.0% (0us) | Total: 0.6% (4.0ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:64` | Self: 0.0% (0us) | Total: 4.7% (30.6ms) | Samples: 0

**Called by:**
- `anonymous` (25)

**Calls:**
- `bound require` (25)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:45` | Self: 0.0% (0us) | Total: 3.6% (23.5ms) | Samples: 0

**Called by:**
- `anonymous` (19)

**Calls:**
- `bound require` (19)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:19` | Self: 0.0% (0us) | Total: 1.2% (7.7ms) | Samples: 0

**Called by:**
- `parseModule` (6)

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/metrics/protobuf/metrics.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/index.js:24` | Self: 0.0% (0us) | Total: 1.5% (9.8ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/v1.js:10` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-lambda/build/src/instrumentation.js:24` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-graphql/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.5% (3.2ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/platform/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/tags.js:11` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `info`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:140` | Self: 0.0% (0us) | Total: 1.1% (7.5ms) | Samples: 0

**Called by:**
- `async initializeCache` (6)

**Calls:**
- `initializeLogger` (3)
- `initializeLogger` (1)
- `log` (1)
- `initializeLogger` (1)

### `processTicksAndRejections`
`[native code]` | Self: 0.0% (0us) | Total: 82.6% (531.3ms) | Samples: 0

**Calls:**
- `(anonymous)` (388)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/modifiers/namespace-ansi.js:1` | Self: 0.0% (0us) | Total: 0.6% (4.0ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston-transport/modern.js:4` | Self: 0.0% (0us) | Total: 1.3% (8.6ms) | Samples: 0

**Called by:**
- `anonymous` (7)

**Calls:**
- `bound require` (7)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/internal/global-utils.js:19` | Self: 0.0% (0us) | Total: 0.6% (4.0ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/context-utils.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:14` | Self: 0.0% (0us) | Total: 2.1% (13.9ms) | Samples: 0

**Called by:**
- `anonymous` (11)

**Calls:**
- `bound require` (11)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:37` | Self: 0.0% (0us) | Total: 1.0% (6.4ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (4)
- `(anonymous)` (1)

### `generateFastpass`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:875` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `write` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-alibaba-cloud/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.7ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:49` | Self: 0.0% (0us) | Total: 0.5% (3.6ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/EnvironmentConfigFactory.js:24` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/platform/index.js:19` | Self: 0.0% (0us) | Total: 1.4% (9.5ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mysql/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:11` | Self: 0.0% (0us) | Total: 1.0% (6.8ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `internal:streams/operators`
`internal:streams/operators:2` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `async wrapKongOperation`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/circuit-breaker.service.ts:168` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `async wrapKongOperation` (1)

**Calls:**
- `getOrCreateBreaker` (1)

### `#getBunSpawnIo`
`node:child_process:568` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `get` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/common/utils.js:20` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/ExportResult.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/exception-handler.js:12` | Self: 0.0% (0us) | Total: 1.6% (10.5ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/exception-handler.js:15` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mongodb/build/src/instrumentation.js:25` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/index.js:21` | Self: 0.0% (0us) | Total: 0.6% (4.2ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/tags.js:8` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:28` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/propagator-b3/build/src/B3Propagator.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async initializeCache`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/cache-factory.ts:78` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `async initializeCache` (1)

**Calls:**
- `async isHealthy` (1)

### `node:util`
`node:util:2` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `anonymous` (2)

### `async initialize`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:181` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `async initialize` (1)

**Calls:**
- `async createBackend` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:21` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/composer.js:4` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `PinoInstrumentation`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pino/build/src/instrumentation.js:32` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `getNodeAutoInstrumentations` (1)

**Calls:**
- `InstrumentationBase` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-grpc/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.5% (3.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-azure/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.5% (3.6ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `init`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/core.js:21` | Self: 0.0% (0us) | Total: 0.6% (4.2ms) | Samples: 0

**Called by:**
- `ZodNumber` (2)
- `ZodNumberFormat` (1)
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/index.js:26` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/import-in-the-middle/index.js:14` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async ensureInitialized`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:155` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `async isHealthy` (1)

**Calls:**
- `async ensureInitialized` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-proto/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-collection.js:7` | Self: 0.0% (0us) | Total: 0.4% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `getNodeAutoInstrumentations`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:166` | Self: 0.0% (0us) | Total: 1.2% (7.8ms) | Samples: 0

**Called by:**
- `async initializeTelemetry` (6)

**Calls:**
- `DnsInstrumentation` (1)
- `RuntimeNodeInstrumentation` (1)
- `KoaInstrumentation` (1)
- `PinoInstrumentation` (1)
- `RedisInstrumentation` (1)
- `AmqplibInstrumentation` (1)

### `async initializeTelemetry`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/instrumentation.ts:185` | Self: 0.0% (0us) | Total: 1.2% (7.8ms) | Samples: 0

**Called by:**
- `(module)` (6)

**Calls:**
- `getNodeAutoInstrumentations` (6)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/logs/protobuf/logs.js:19` | Self: 0.0% (0us) | Total: 3.1% (20.4ms) | Samples: 0

**Called by:**
- `anonymous` (17)

**Calls:**
- `bound require` (17)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:14` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-proto/build/src/platform/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `OTLPTraceExporter`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-http/build/src/platform/node/OTLPTraceExporter.js:27` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `async initializeTelemetry` (1)

**Calls:**
- `createOtlpExportDelegate` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/safe.js:9` | Self: 0.0% (0us) | Total: 1.5% (9.9ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `async ensureInitialized`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:165` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `async ensureInitialized` (1)

**Calls:**
- `async initialize` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-ioredis/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/otlp-http-export-delegate.js:20` | Self: 0.0% (0us) | Total: 0.6% (4.0ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-memcached/build/src/instrumentation.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/index.js:63` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-grpc/build/src/serverUtils.js:26` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/propagator-jaeger/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/trace/protobuf/index.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/fecha/lib/fecha.umd.js:2` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/index.js:19` | Self: 0.0% (0us) | Total: 1.6% (10.4ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-generic-pool/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/metrics/internal.js:6` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:58` | Self: 0.0% (0us) | Total: 0.6% (3.9ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/configuration/build/src/index.js:19` | Self: 0.0% (0us) | Total: 5.7% (37.0ms) | Samples: 0

**Called by:**
- `anonymous` (29)

**Calls:**
- `bound require` (29)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_readable.js:62` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-ioredis/build/src/instrumentation.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/directives.js:4` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/ServicesExtensions.js:8` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:4` | Self: 0.0% (0us) | Total: 2.4% (15.5ms) | Samples: 0

**Called by:**
- `anonymous` (13)

**Calls:**
- `bound require` (13)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-net/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.5% (3.4ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-grpc/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/propagator-b3/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterProviderSharedState.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:34` | Self: 0.0% (0us) | Total: 0.7% (5.0ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:953` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `$constructor` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/diag/ComponentLogger.js:19` | Self: 0.0% (0us) | Total: 0.8% (5.1ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/index.js:19` | Self: 0.0% (0us) | Total: 1.2% (7.7ms) | Samples: 0

**Called by:**
- `anonymous` (6)

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-cucumber/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:24` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-hapi/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:33` | Self: 0.0% (0us) | Total: 0.5% (3.2ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/composer.js:8` | Self: 0.0% (0us) | Total: 0.9% (5.9ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/readable.js:7` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/api/propagation.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mongoose/build/src/mongoose.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:31` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-redis/build/src/redis.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `EventLoopDelayCollector`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/metrics/eventLoopDelayCollector.js:11` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `RuntimeNodeInstrumentation` (1)

**Calls:**
- `monitorEventLoopDelay` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/Logger.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:40` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:365` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `init` (1)

**Calls:**
- `init` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:28` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-container/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gaxios/build/src/gaxios.js:60` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:62` | Self: 0.0% (0us) | Total: 0.8% (5.6ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-knex/build/src/utils.js:20` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/transport/http-exporter-transport.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-hapi/build/src/utils.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js:24` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/index.js:27` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/platform/node/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `node:fs`
`node:fs:2` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js:45` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-grpc-exporter-base/build/src/configuration/convert-legacy-otlp-grpc-options.js:5` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `_updateMetricInstruments`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-kafkajs/build/src/instrumentation.js:52` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `setMeterProvider` (1)

**Calls:**
- `createCounter` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/doc.js:21` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `map` (1)

**Calls:**
- `trimStart` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-ioredis/build/src/instrumentation.js:27` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-fastify/build/src/instrumentation.js:27` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/index.js:25` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-knex/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.5% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:41` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston.js:10` | Self: 0.0% (0us) | Total: 1.9% (12.3ms) | Samples: 0

**Called by:**
- `parseModule` (10)

**Calls:**
- `bound require` (10)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/uuid/dist/index.js:61` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `RedisInstrumentationV4_V5`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-redis/build/src/v4-v5/instrumentation.js:33` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `RedisInstrumentation` (1)

**Calls:**
- `InstrumentationBase` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/nodes/Pair.js:5` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/nodes/Alias.js:3` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async wrapKongOperation`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/circuit-breaker.service.ts:160` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `async healthCheck` (1)

**Calls:**
- `async wrapKongOperation` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:33` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-net/build/src/instrumentation.js:27` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/index-node-http.js:25` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-proto/build/src/platform/node/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-prometheus/build/src/PrometheusExporter.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async healthCheck`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/adapters/kong.adapter.ts:286` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `async healthCheck` (1)

**Calls:**
- `async wrapKongOperation` (1)

### `async getMachineId`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-darwin.js:23` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `async getMachineId` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js:37` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async initialize`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:170` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `async ensureInitialized` (1)

**Calls:**
- `async initialize` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/metric.js:22` | Self: 0.0% (0us) | Total: 0.8% (5.3ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/exception-handler.js:14` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:27` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/platform/node/export/BatchSpanProcessor.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:25` | Self: 0.0% (0us) | Total: 0.8% (5.7ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-koa/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/utils.js:21` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/configuration/convert-legacy-node-http-options.js:7` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-undici/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `inquire`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@protobufjs/inquire/index.js:12` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/readable.js:12` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-node/build/src/NodeTracerProvider.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/export/MetricReader.js:21` | Self: 0.0% (0us) | Total: 1.3% (8.7ms) | Samples: 0

**Called by:**
- `anonymous` (7)

**Calls:**
- `bound require` (7)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:78` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/trace/index.js:36` | Self: 0.0% (0us) | Total: 0.3% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `async connect`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/shared-redis-cache.ts:40` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `async connect` (2)

**Calls:**
- `instrumentRedisOperation` (1)
- `run` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/composer.js:5` | Self: 0.0% (0us) | Total: 2.6% (16.8ms) | Samples: 0

**Called by:**
- `anonymous` (13)

**Calls:**
- `bound require` (13)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/index.js:21` | Self: 0.0% (0us) | Total: 1.4% (9.4ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-runtime-node/build/src/instrumentation.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:39` | Self: 0.0% (0us) | Total: 0.4% (2.9ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `bound require` (2)

### `KongAdapter`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/adapters/kong.adapter.ts:58` | Self: 0.0% (0us) | Total: 1.4% (9.1ms) | Samples: 0

**Called by:**
- `(module)` (7)

**Calls:**
- `async initializeCache` (7)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-proto/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detect-resources.js:20` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:36` | Self: 0.0% (0us) | Total: 0.9% (6.2ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/compose/compose-scalar.js:5` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/node/development.js:30` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/debug/src/node.js:240` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `setup` (1)

### `spawn`
`node:child_process:701` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `spawn` (1)

**Calls:**
- `get` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-knex/build/src/instrumentation.js:24` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:63` | Self: 0.0% (0us) | Total: 0.4% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/stats/si.js:22` | Self: 0.0% (0us) | Total: 0.8% (5.3ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-grpc/build/src/instrumentation.js:26` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterSharedState.js:24` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/create-logger.js:12` | Self: 0.0% (0us) | Total: 4.5% (29.5ms) | Samples: 0

**Called by:**
- `anonymous` (23)

**Calls:**
- `bound require` (23)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/exponential-histogram/mapping/getMapping.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/eachOf.js:15` | Self: 0.0% (0us) | Total: 0.8% (5.3ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/index.js:21` | Self: 0.0% (0us) | Total: 0.1% (845us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `_number`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/api.js:302` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `ZodNumber` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-http/build/src/platform/node/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-express/build/src/instrumentation.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js:41` | Self: 0.0% (0us) | Total: 0.6% (3.9ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-graphql/build/src/instrumentation.js:25` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/eachOfLimit.js:7` | Self: 0.0% (0us) | Total: 0.8% (5.3ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston.js:89` | Self: 0.0% (0us) | Total: 0.3% (2.1ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `(anonymous)` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/Document.js:6` | Self: 0.0% (0us) | Total: 0.6% (3.9ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/index.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/host-metrics/build/src/BaseMetrics.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:21` | Self: 0.0% (0us) | Total: 0.4% (2.7ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/state/MeterSharedState.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:39` | Self: 0.0% (0us) | Total: 0.5% (3.7ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js:25` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/ServicesExtensions.js:4` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-graphql/build/src/instrumentation.js:22` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:55` | Self: 0.0% (0us) | Total: 0.4% (2.7ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/forwarded-parse/index.js:6` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `compile`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/doc.js:33` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `generateFastpass` (1)

**Calls:**
- `Function` (1)

### `async isHealthy`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts:64` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `async isHealthy` (1)

**Calls:**
- `async ensureInitialized` (1)

### `setTracerProvider`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-lambda/build/src/instrumentation.js:300` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `enableInstrumentations` (1)

**Calls:**
- `_traceForceFlush` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:61` | Self: 0.0% (0us) | Total: 0.6% (3.9ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `write`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/doc.js:21` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `generateFastpass` (1)

**Calls:**
- `map` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:26` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `async createKongCache`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/services/cache/cache-factory.ts:14` | Self: 0.0% (0us) | Total: 1.4% (9.1ms) | Samples: 0

**Called by:**
- `async initializeCache` (7)

**Calls:**
- `async createKongCache` (7)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gaxios/build/src/gaxios.js:54` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `DnsInstrumentation`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-dns/build/src/instrumentation.js:29` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `getNodeAutoInstrumentations` (1)

**Calls:**
- `InstrumentationBase` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-fs/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/checks.js:420` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `runChecks` (1)

**Calls:**
- `test` (1)

### `patchedRequire`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/require-in-the-middle/index.js:209` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `bound require` (1)

**Calls:**
- `require` (1)

### `Logger`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:42` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `DerivedLogger` (1)

**Calls:**
- `configure` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-connect/build/src/instrumentation.js:23` | Self: 0.0% (0us) | Total: 0.1% (942us) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-logs/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.5ms) | Samples: 0

**Called by:**
- `parseModule` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:1648` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `(anonymous)` (1)

### `_getTracer`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:46` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `startSpan` (1)

**Calls:**
- `getTracer` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-exporter-base/build/src/index-node-http.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/view/Aggregation.js:20` | Self: 0.0% (0us) | Total: 1.1% (7.6ms) | Samples: 0

**Called by:**
- `anonymous` (6)

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:35` | Self: 0.0% (0us) | Total: 0.5% (3.5ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pino/build/src/instrumentation.js:23` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston.js:182` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `forFunctions` (1)

### `Transform`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/_stream_transform.js:95` | Self: 0.0% (0us) | Total: 0.1% (827us) | Samples: 0

**Called by:**
- `Logger` (1)

**Calls:**
- `Duplex` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/triple-beam/index.js:45` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js:75` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `clone` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mysql2/build/src/instrumentation.js:23` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-http/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.9% (6.2ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-proto/build/src/platform/node/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `registerAllRoutes`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/openapi-generator.ts:178` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `(module)` (1)

**Calls:**
- `forEach` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-redis/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.6ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `configure`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:105` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `Logger` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gaxios/build/src/gaxios.js:64` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/index.js:16` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/fecha/lib/fecha.umd.js:81` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `assign` (1)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/schemas.ts:299` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `(anonymous)` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js:407` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `internal:shared`
`internal:shared:2` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-fastify/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-cucumber/build/src/instrumentation.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/index.js:19` | Self: 0.0% (0us) | Total: 3.7% (23.8ms) | Samples: 0

**Called by:**
- `anonymous` (20)

**Calls:**
- `bound require` (20)

### `setup`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/debug/src/common.js:287` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `enable` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-pg/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.5% (3.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:47` | Self: 0.0% (0us) | Total: 0.6% (3.8ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-hapi/build/src/instrumentation.js:23` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/metrics/protobuf/index.js:20` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `generateFastpass`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:896` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `compile` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-darwin.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/aggregator/index.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-node/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/writer.js:4` | Self: 0.0% (0us) | Total: 1.7% (11.1ms) | Samples: 0

**Called by:**
- `anonymous` (9)

**Calls:**
- `bound require` (9)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-nestjs-core/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/index.js:31` | Self: 0.0% (0us) | Total: 1.9% (12.5ms) | Samples: 0

**Called by:**
- `anonymous` (10)

**Calls:**
- `bound require` (10)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 8.5% (55.1ms) | Samples: 0

**Called by:**
- `moduleEvaluation` (37)
- `async asyncModuleEvaluation` (10)

**Calls:**
- `moduleEvaluation` (37)
- `evaluate` (10)

### `(module)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/config/loader.ts:45` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `(anonymous)` (1)

### `initializeLogger`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/winston-logger.ts:38` | Self: 0.0% (0us) | Total: 0.5% (3.6ms) | Samples: 0

**Called by:**
- `info` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:52` | Self: 0.0% (0us) | Total: 0.5% (3.6ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-gcp/build/src/detectors/index.js:19` | Self: 0.0% (0us) | Total: 4.5% (29.4ms) | Samples: 0

**Called by:**
- `anonymous` (24)

**Calls:**
- `bound require` (24)

### `bound resolve`
`[native code]` | Self: 0.0% (0us) | Total: 0.8% (5.2ms) | Samples: 0

**Called by:**
- `(anonymous)` (4)

**Calls:**
- `anonymous` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/build/src/trace/W3CTraceContextPropagator.js:21` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `KoaInstrumentation`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-koa/build/src/instrumentation.js:30` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `getNodeAutoInstrumentations` (1)

**Calls:**
- `InstrumentationBase` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/aws-sdk.js:22` | Self: 0.0% (0us) | Total: 1.2% (7.7ms) | Samples: 0

**Called by:**
- `anonymous` (6)

**Calls:**
- `bound require` (6)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js:42` | Self: 0.0% (0us) | Total: 1.5% (10.2ms) | Samples: 0

**Called by:**
- `anonymous` (8)

**Calls:**
- `bound require` (8)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@dabh/diagnostics/node/development.js:29` | Self: 0.0% (0us) | Total: 0.7% (5.0ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js:198` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/internal/eachOfLimit.js:19` | Self: 0.0% (0us) | Total: 0.4% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `async connect`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/backends/shared-redis-backend.ts:70` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `async connect` (2)

**Calls:**
- `async connect` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:54` | Self: 0.0% (0us) | Total: 0.7% (4.6ms) | Samples: 0

**Called by:**
- `anonymous` (4)

**Calls:**
- `bound require` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/platform/index.js:19` | Self: 0.0% (0us) | Total: 9.8% (63.0ms) | Samples: 0

**Called by:**
- `anonymous` (52)

**Calls:**
- `bound require` (52)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resource-detector-alibaba-cloud/build/src/detectors/AlibabaCloudEcsDetector.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `runChecks`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js:46` | Self: 0.0% (0us) | Total: 0.2% (1.2ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `(anonymous)` (1)

### `forFunctions`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/common.js:33` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `forEach` (1)

### `Logger`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/logger.js:41` | Self: 0.0% (0us) | Total: 0.1% (827us) | Samples: 0

**Called by:**
- `DerivedLogger` (1)

**Calls:**
- `Transform` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/logform/index.js:16` | Self: 0.0% (0us) | Total: 1.7% (11.2ms) | Samples: 0

**Called by:**
- `anonymous` (9)

**Calls:**
- `bound require` (9)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/winston/lib/winston/exception-handler.js:13` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/schema/yaml-1.1/omap.js:7` | Self: 0.0% (0us) | Total: 0.2% (1.3ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/yaml/dist/doc/Document.js:4` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/trace/W3CTraceContextPropagator.js:21` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/generated/root.js:122` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `(anonymous)` (1)

**Calls:**
- `getOneOf` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:20` | Self: 0.0% (0us) | Total: 6.4% (41.6ms) | Samples: 0

**Called by:**
- `anonymous` (34)

**Calls:**
- `bound require` (34)

### `node:_http_common`
`node:_http_common:2` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/resources/build/src/detectors/platform/node/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.2ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `enableInstrumentations`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/autoLoaderUtils.js:29` | Self: 0.0% (0us) | Total: 0.1% (1.2ms) | Samples: 0

**Called by:**
- `registerInstrumentations` (1)

**Calls:**
- `setTracerProvider` (1)

### `CircuitBreaker`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/opossum/lib/circuit.js:187` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `getOrCreateBreaker` (1)

**Calls:**
- `isInteger` (1)

### `AmqplibInstrumentation`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-amqplib/build/src/amqplib.js:32` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `getNodeAutoInstrumentations` (1)

**Calls:**
- `InstrumentationBase` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/platform/node/index.js:19` | Self: 0.0% (0us) | Total: 9.6% (61.8ms) | Samples: 0

**Called by:**
- `anonymous` (51)

**Calls:**
- `bound require` (51)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-connect/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (1.9ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:30` | Self: 0.0% (0us) | Total: 0.3% (2.4ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/async/internal/wrapAsync.js:8` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:59` | Self: 0.0% (0us) | Total: 0.3% (2.5ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/auto-instrumentations-node/build/src/utils.js:29` | Self: 0.0% (0us) | Total: 0.5% (3.5ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api-logs/build/src/index.js:24` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/otlp-transformer/build/src/index.js:29` | Self: 0.0% (0us) | Total: 0.2% (1.5ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-logs-otlp-grpc/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.5% (3.2ms) | Samples: 0

**Called by:**
- `anonymous` (3)

**Calls:**
- `bound require` (3)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/common/time.js:19` | Self: 0.0% (0us) | Total: 1.7% (11.3ms) | Samples: 0

**Called by:**
- `anonymous` (9)

**Calls:**
- `bound require` (9)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-mongoose/build/src/index.js:19` | Self: 0.0% (0us) | Total: 0.3% (2.3ms) | Samples: 0

**Called by:**
- `anonymous` (2)

**Calls:**
- `bound require` (2)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/sampler/AlwaysOffSampler.js:19` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sql-common/node_modules/@opentelemetry/core/node_modules/@opentelemetry/semantic-conventions/build/src/index.js:38` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `::bunternal::`
`node:v8:55` | Self: 0.0% (0us) | Total: 1.0% (6.5ms) | Samples: 0

**Called by:**
- `initializeGCMetrics` (5)

**Calls:**
- `heapStats` (4)
- `memoryUsage` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/Tracer.js:22` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-aws-sdk/build/src/services/ServicesExtensions.js:5` | Self: 0.0% (0us) | Total: 0.2% (1.4ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation-oracledb/build/src/OracleTelemetryTraceHandler.js:23` | Self: 0.0% (0us) | Total: 0.1% (1.1ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 2.5% (16.5ms) | Samples: 0

**Called by:**
- `(anonymous)` (14)

**Calls:**
- `async asyncModuleEvaluation` (10)
- `linkAndEvaluateModule` (4)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-metrics-otlp-http/build/src/platform/node/OTLPMetricExporter.js:21` | Self: 0.0% (0us) | Total: 1.0% (6.7ms) | Samples: 0

**Called by:**
- `anonymous` (5)

**Calls:**
- `bound require` (5)

### `(anonymous)`
`/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/exporter-trace-otlp-proto/build/src/platform/index.js:19` | Self: 0.0% (0us) | Total: 0.1% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `bound require` (1)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 91.6% | 588.9ms | `[native code]` |
| 2.3% | 15.0ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/telemetry/metrics.ts` |
| 0.5% | 3.2ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/classic/schemas.js` |
| 0.4% | 2.7ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/protobufjs/src/util/minimal.js` |
| 0.2% | 1.5ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/cache/cache-manager.ts` |
| 0.2% | 1.3ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-metrics/build/src/Meter.js` |
| 0.2% | 1.3ms | `node:perf_hooks` |
| 0.2% | 1.3ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/debug/src/common.js` |
| 0.2% | 1.3ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@so-ric/colorspace/dist/index.cjs.js` |
| 0.2% | 1.3ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/schemas.js` |
| 0.2% | 1.3ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/platform/index.js` |
| 0.2% | 1.2ms | `internal:fs/streams` |
| 0.2% | 1.2ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/instrumentation/build/src/platform/node/instrumentation.js` |
| 0.1% | 1.2ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/trace/ProxyTracerProvider.js` |
| 0.1% | 1.2ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/json-bigint/lib/parse.js` |
| 0.1% | 1.2ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/semantic-conventions/build/src/index.js` |
| 0.1% | 1.2ms | `node:child_process` |
| 0.1% | 1.2ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/colors.js` |
| 0.1% | 1.1ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/api/build/src/diag/ComponentLogger.js` |
| 0.1% | 1.1ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-node/build/src/sdk.js` |
| 0.1% | 1.1ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@colors/colors/lib/styles.js` |
| 0.1% | 1.1ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/core/build/src/ExportResult.js` |
| 0.1% | 1.1ms | `node:fs/promises` |
| 0.1% | 1.1ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/src/openapi-generator.ts` |
| 0.1% | 1.1ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/google-logging-utils/build/src/logging-utils.js` |
| 0.1% | 1.1ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/@opentelemetry/sdk-trace-base/build/src/BasicTracerProvider.js` |
| 0.1% | 1.1ms | `node:crypto` |
| 0.1% | 1.1ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/gcp-metadata/build/src/index.js` |
| 0.1% | 1.0ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/fecha/lib/fecha.umd.js` |
| 0.1% | 1.0ms | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/zod/v4/core/util.js` |
| 0.1% | 827us | `/Users/Simon.Owusu@Tommy.com/WebstormProjects/pvh.services.authentication-v2/node_modules/readable-stream/lib/internal/streams/buffer_list.js` |
