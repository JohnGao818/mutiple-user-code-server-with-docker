"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaseUrl = getBaseUrl;
exports.getApiModelId = getApiModelId;
exports.getMaxTokens = getMaxTokens;
exports.getDebugMode = getDebugMode;
exports.getDebugLoggingEnabled = getDebugLoggingEnabled;
exports.getRequestDumpEnabled = getRequestDumpEnabled;
exports.getStabilizeToolListEnabled = getStabilizeToolListEnabled;
exports.migrateLegacyDebugSetting = migrateLegacyDebugSetting;
const vscode_1 = __importDefault(require("vscode"));
const consts_1 = require("./consts");
/**
 * Get DeepSeek API base URL from settings.
 * Falls back to the official endpoint when not configured.
 */
function getBaseUrl() {
    const config = vscode_1.default.workspace.getConfiguration(consts_1.CONFIG_SECTION);
    return config.get('baseUrl') || 'https://api.deepseek.com';
}
/**
 * Resolve the API model ID to send to the endpoint.
 *
 * Users can override model IDs via the `modelIdOverrides` setting object
 * (e.g. for third-party API proxies). Falls back to the VS Code model ID
 * when no override is configured.
 */
function getApiModelId(vscodeModelId) {
    const config = vscode_1.default.workspace.getConfiguration(consts_1.CONFIG_SECTION);
    const overrides = config.get('modelIdOverrides');
    const override = overrides?.[vscodeModelId]?.trim();
    return override || vscodeModelId;
}
/**
 * Get the configured max output tokens limit.
 * Returns `undefined` when set to 0 (API default — no limit).
 */
function getMaxTokens() {
    const config = vscode_1.default.workspace.getConfiguration(consts_1.CONFIG_SECTION);
    const value = config.get('maxTokens', 0);
    return value > 0 ? value : undefined;
}
/**
 * Diagnostic mode. `verbose` also enables metadata logs.
 *
 * The legacy boolean `debug` setting is still read as a fallback so old
 * settings keep working even if migration cannot update every scope.
 */
function getDebugMode() {
    const config = vscode_1.default.workspace.getConfiguration(consts_1.CONFIG_SECTION);
    const mode = getConfiguredDebugMode(config);
    if (mode)
        return mode;
    return config.get('debug', false) ? 'metadata' : 'minimal';
}
/**
 * Whether to log privacy-preserving diagnostic debug information.
 */
function getDebugLoggingEnabled() {
    return getDebugMode() !== 'minimal';
}
/**
 * Whether to write full DeepSeek request payloads to disk.
 */
function getRequestDumpEnabled() {
    return getDebugMode() === 'verbose';
}
function getStabilizeToolListEnabled() {
    const config = vscode_1.default.workspace.getConfiguration(consts_1.CONFIG_SECTION);
    return config.get('experimental.stabilizeToolList', false);
}
/**
 * Migrate the legacy boolean `deepseek-copilot.debug` setting to `debugMode`.
 *
 * `debug: true` maps to `debugMode: metadata`; `debug: false` maps to the
 * default `minimal`, so it only needs cleanup.
 */
async function migrateLegacyDebugSetting() {
    await migrateLegacyDebugSettingAtScope(vscode_1.default.ConfigurationTarget.Global);
    if (vscode_1.default.workspace.workspaceFile || vscode_1.default.workspace.workspaceFolders?.length) {
        await migrateLegacyDebugSettingAtScope(vscode_1.default.ConfigurationTarget.Workspace);
    }
}
function getConfiguredDebugMode(config) {
    const mode = config.inspect('debugMode');
    return normalizeDebugMode(mode?.workspaceValue) ?? normalizeDebugMode(mode?.globalValue);
}
function normalizeDebugMode(value) {
    if (value === 'minimal' || value === 'metadata' || value === 'verbose') {
        return value;
    }
    return undefined;
}
async function migrateLegacyDebugSettingAtScope(target, resource) {
    const config = vscode_1.default.workspace.getConfiguration(consts_1.CONFIG_SECTION, resource);
    const legacy = config.inspect('debug');
    const mode = config.inspect('debugMode');
    const legacyValue = getScopedValue(legacy, target);
    if (legacyValue === undefined) {
        return;
    }
    if (legacyValue === true && getScopedValue(mode, target) === undefined) {
        await config.update('debugMode', 'metadata', target);
    }
    await config.update('debug', undefined, target);
}
function getScopedValue(inspection, target) {
    if (!inspection) {
        return undefined;
    }
    if (target === vscode_1.default.ConfigurationTarget.Global) {
        return inspection.globalValue;
    }
    if (target === vscode_1.default.ConfigurationTarget.Workspace) {
        return inspection.workspaceValue;
    }
    return undefined;
}
//# sourceMappingURL=config.js.map