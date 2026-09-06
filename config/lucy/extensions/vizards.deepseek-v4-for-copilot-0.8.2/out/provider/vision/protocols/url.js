"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveVisionEndpoint = resolveVisionEndpoint;
exports.validateVisionEndpointUrl = validateVisionEndpointUrl;
const i18n_1 = require("../../../i18n");
const errors_1 = require("./errors");
function resolveVisionEndpoint(config) {
    return createUrl(config.url);
}
function validateVisionEndpointUrl(value) {
    createUrl(value);
}
function createUrl(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new errors_1.VisionProxyError('invalid-url', (0, i18n_1.t)('vision.proxy.error.invalidUrlProtocol'));
        }
        return url;
    }
    catch (error) {
        if (error instanceof errors_1.VisionProxyError) {
            throw error;
        }
        throw new errors_1.VisionProxyError('invalid-url', (0, i18n_1.t)('vision.proxy.error.invalidUrl'), undefined, error);
    }
}
//# sourceMappingURL=url.js.map