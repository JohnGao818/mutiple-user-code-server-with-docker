"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCustomHeaders = normalizeCustomHeaders;
exports.createProviderHeaders = createProviderHeaders;
const i18n_1 = require("../../../i18n");
const errors_1 = require("./errors");
function normalizeCustomHeaders(headers) {
    if (headers === undefined || headers === null) {
        return undefined;
    }
    if (typeof headers !== 'object' || Array.isArray(headers)) {
        throw new errors_1.VisionProxyError('invalid-custom-headers', (0, i18n_1.t)('vision.proxy.error.customHeadersObject'));
    }
    const normalized = {};
    for (const [rawName, rawValue] of Object.entries(headers)) {
        const name = rawName.trim();
        if (!name) {
            throw new errors_1.VisionProxyError('invalid-custom-headers', (0, i18n_1.t)('vision.proxy.error.customHeaderNameEmpty'));
        }
        if (!isValidHeaderName(name)) {
            throw new errors_1.VisionProxyError('invalid-custom-headers', (0, i18n_1.t)('vision.proxy.error.customHeaderNameInvalid', name));
        }
        if (typeof rawValue !== 'string') {
            throw new errors_1.VisionProxyError('invalid-custom-headers', (0, i18n_1.t)('vision.proxy.error.customHeaderValueString', name));
        }
        const value = rawValue.trim();
        if (!value) {
            continue;
        }
        if (!isValidHeaderValue(value)) {
            throw new errors_1.VisionProxyError('invalid-custom-headers', (0, i18n_1.t)('vision.proxy.error.customHeaderValueInvalid', name));
        }
        setHeader(normalized, name, value);
    }
    return Object.keys(normalized).length > 0 ? normalized : undefined;
}
function createProviderHeaders(config, apiKey) {
    const headers = {
        'content-type': 'application/json',
    };
    if (config.providerFamily === 'anthropic-compatible') {
        headers['anthropic-version'] = '2023-06-01';
        if (apiKey) {
            headers['x-api-key'] = apiKey;
        }
    }
    else if (apiKey) {
        headers.authorization = `Bearer ${apiKey}`;
    }
    for (const [name, value] of Object.entries(config.headers ?? {})) {
        setHeader(headers, name, value);
    }
    return headers;
}
function setHeader(headers, name, value) {
    const lowerName = name.toLowerCase();
    for (const existingName of Object.keys(headers)) {
        if (existingName.toLowerCase() === lowerName) {
            delete headers[existingName];
        }
    }
    headers[name] = value;
}
function isValidHeaderName(name) {
    return /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u.test(name);
}
function isValidHeaderValue(value) {
    return !/[\r\n]/u.test(value);
}
//# sourceMappingURL=headers.js.map