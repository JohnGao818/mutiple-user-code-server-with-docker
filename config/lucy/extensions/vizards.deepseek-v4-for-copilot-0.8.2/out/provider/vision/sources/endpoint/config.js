"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisionProxyConfigStore = exports.VISION_PROXY_API_KEY_SECRET = exports.VISION_PROXY_SOURCE_KEY = exports.VISION_PROXY_CONFIG_KEY = void 0;
exports.normalizeVisionProxyConfig = normalizeVisionProxyConfig;
exports.normalizeVisionProxySource = normalizeVisionProxySource;
const i18n_1 = require("../../../../i18n");
const errors_1 = require("../../protocols/errors");
const headers_1 = require("../../protocols/headers");
const url_1 = require("../../protocols/url");
const consts_1 = require("../../consts");
exports.VISION_PROXY_CONFIG_KEY = 'deepseek-copilot.visionProxy.config';
exports.VISION_PROXY_SOURCE_KEY = 'deepseek-copilot.visionProxy.source';
exports.VISION_PROXY_API_KEY_SECRET = 'deepseek-copilot.visionProxy.apiKey';
const PROTECTED_EXTRA_BODY_KEYS = new Set(['model', 'messages', 'input', 'stream']);
class VisionProxyConfigStore {
    context;
    constructor(context) {
        this.context = context;
    }
    getConfig() {
        const rawConfig = this.context.globalState.get(exports.VISION_PROXY_CONFIG_KEY);
        if (rawConfig === undefined) {
            return undefined;
        }
        return normalizeVisionProxyConfig(rawConfig);
    }
    saveConfig(config) {
        return this.context.globalState.update(exports.VISION_PROXY_CONFIG_KEY, normalizeVisionProxyConfig(config));
    }
    getSource() {
        return normalizeVisionProxySource(this.context.globalState.get(exports.VISION_PROXY_SOURCE_KEY));
    }
    saveSource(source) {
        return this.context.globalState.update(exports.VISION_PROXY_SOURCE_KEY, source);
    }
    getApiKey() {
        return this.context.secrets.get(exports.VISION_PROXY_API_KEY_SECRET);
    }
    setApiKey(apiKey) {
        return this.context.secrets.store(exports.VISION_PROXY_API_KEY_SECRET, apiKey.trim());
    }
    deleteApiKey() {
        return this.context.secrets.delete(exports.VISION_PROXY_API_KEY_SECRET);
    }
    async hasApiKey() {
        const apiKey = await this.getApiKey();
        return Boolean(apiKey?.trim());
    }
}
exports.VisionProxyConfigStore = VisionProxyConfigStore;
function normalizeVisionProxyConfig(value) {
    if (!isRecord(value)) {
        throw new errors_1.VisionProxyError('missing-configuration', (0, i18n_1.t)('vision.proxy.error.configurationInvalid'));
    }
    const providerFamily = normalizeProviderFamily(value.providerFamily);
    const url = normalizeRequiredString(value.url, (0, i18n_1.t)('vision.panel.field.endpointUrl'));
    (0, url_1.validateVisionEndpointUrl)(url);
    const apiType = normalizeApiType(providerFamily, value.apiType);
    const modelId = normalizeRequiredString(value.modelId, (0, i18n_1.t)('vision.panel.field.modelId'));
    const headers = (0, headers_1.normalizeCustomHeaders)(value.headers);
    const extraBody = normalizeExtraBody(value.extraBody);
    const timeoutMs = normalizeTimeoutMs(value.timeoutMs);
    return {
        providerFamily,
        apiType,
        url,
        modelId,
        timeoutMs,
        headers,
        extraBody,
        updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
    };
}
function normalizeVisionProxySource(value) {
    if (value === 'api-endpoint' || value === 'vscode-lm') {
        return value;
    }
    return undefined;
}
function normalizeProviderFamily(value) {
    if (value === 'anthropic-compatible' || value === 'openai-compatible') {
        return value;
    }
    throw new errors_1.VisionProxyError('missing-configuration', (0, i18n_1.t)('vision.proxy.error.providerFamilyInvalid'));
}
function normalizeApiType(providerFamily, value) {
    if (providerFamily === 'anthropic-compatible') {
        return 'messages';
    }
    if (value === 'chat-completions' || value === 'responses') {
        return value;
    }
    throw new errors_1.VisionProxyError('missing-configuration', (0, i18n_1.t)('vision.proxy.error.apiTypeInvalid'));
}
function normalizeRequiredString(value, label) {
    const text = normalizeString(value);
    if (!text) {
        throw new errors_1.VisionProxyError('missing-configuration', (0, i18n_1.t)('vision.proxy.error.fieldRequired', label));
    }
    return text;
}
function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function normalizeExtraBody(value) {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (!isRecord(value)) {
        throw new errors_1.VisionProxyError('missing-configuration', (0, i18n_1.t)('vision.proxy.error.extraBodyObject'));
    }
    const normalized = {};
    for (const [key, entryValue] of Object.entries(value)) {
        if (PROTECTED_EXTRA_BODY_KEYS.has(key)) {
            throw new errors_1.VisionProxyError('missing-configuration', (0, i18n_1.t)('vision.proxy.error.extraBodyProtectedKey', key));
        }
        normalized[key] = entryValue;
    }
    return Object.keys(normalized).length > 0 ? normalized : undefined;
}
/**
 * Normalize the user-supplied timeout in milliseconds.
 *
 * Returns `undefined` (→ fall back to {@link DEFAULT_TIMEOUT_MS}) when the
 * value is missing, not a finite number, or ≤ 0. Values above
 * {@link MAX_TIMEOUT_MS} are clamped to the cap, and non-integer values are
 * truncated, because Node's `setTimeout()` treats delays larger than
 * `2_147_483_647` ms as `1` ms and truncates fractional delays.
 */
function normalizeTimeoutMs(value) {
    if (value === undefined || value === null) {
        return undefined;
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
        return undefined;
    }
    return Math.min(Math.trunc(num), consts_1.MAX_TIMEOUT_MS);
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=config.js.map