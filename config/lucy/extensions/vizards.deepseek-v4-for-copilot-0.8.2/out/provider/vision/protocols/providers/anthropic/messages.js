"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anthropicMessagesAdapter = void 0;
const i18n_1 = require("../../../../../i18n");
const errors_1 = require("../../errors");
const utils_1 = require("../utils");
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;
exports.anthropicMessagesAdapter = {
    createBody(config, request) {
        return createBody(config, request);
    },
    parseResponse(value) {
        return parseResponse(value);
    },
};
function createBody(config, request) {
    return {
        max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
        ...config.extraBody,
        model: config.modelId,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: request.prompt },
                    ...request.images.map((image) => ({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: image.mimeType,
                            data: (0, utils_1.toBase64)(image),
                        },
                    })),
                ],
            },
        ],
    };
}
function parseResponse(value) {
    if (!(0, utils_1.isRecord)(value) || !Array.isArray(value.content)) {
        throw new errors_1.VisionProxyError('unsupported-response', (0, i18n_1.t)('vision.proxy.error.unsupportedAnthropicResponse'));
    }
    const text = value.content
        .map((block) => ((0, utils_1.isRecord)(block) && block.type === 'text' ? block.text : undefined))
        .filter((item) => typeof item === 'string')
        .join('')
        .trim();
    if (!text) {
        throw new errors_1.VisionProxyError('empty-response', (0, i18n_1.t)('vision.proxy.error.emptyResponse'));
    }
    return text;
}
//# sourceMappingURL=messages.js.map