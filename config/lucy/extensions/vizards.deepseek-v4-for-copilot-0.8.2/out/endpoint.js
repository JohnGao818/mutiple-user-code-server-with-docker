"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OFFICIAL_DEEPSEEK_API_HOST = void 0;
exports.isOfficialDeepSeekBaseUrl = isOfficialDeepSeekBaseUrl;
exports.normalizeBaseUrl = normalizeBaseUrl;
exports.OFFICIAL_DEEPSEEK_API_HOST = 'api.deepseek.com';
function isOfficialDeepSeekBaseUrl(baseUrl) {
    try {
        return new URL(baseUrl).hostname.toLowerCase() === exports.OFFICIAL_DEEPSEEK_API_HOST;
    }
    catch {
        return false;
    }
}
function normalizeBaseUrl(baseUrl) {
    return baseUrl.trim().replace(/\/+$/u, '');
}
//# sourceMappingURL=endpoint.js.map