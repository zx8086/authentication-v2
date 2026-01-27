/* packages/stryker-bun-runner/src/stryker-plugin.ts */

// Dynamic import to handle ESM/CommonJS interop
import { BunTestRunner } from "./bun-test-runner";

/**
 * Stryker plugin declaration
 * Registers BunTestRunner as a test runner plugin named "bun"
 * Uses require to handle @stryker-mutator/api ESM module
 */
const api = require("@stryker-mutator/api/plugin");
const { declareClassPlugin, PluginKind } = api;

export const strykerPlugins = [
  declareClassPlugin(PluginKind.TestRunner, "bun", BunTestRunner as any),
];
