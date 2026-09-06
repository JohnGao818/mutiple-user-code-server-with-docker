"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIChatAdapter = void 0;
const i18n_1 = require("../../../../../i18n");
const errors_1 = require("../../errors");
const utils_1 = require("../utils");
exports.openAIChatAdapter = {
    createBody(config, request) {
        return createBody(config, request);
    },
    parseResponse(value) {
        return parseResponse(value);
    },
};
function createBody(config, request) {
    return {
        ...config.extraBody,
        model: config.modelId,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: request.prompt },
                    ...request.images.map((image) => ({
                        type: 'image_url',
                        image_url: {
                            url: `data:${image.mimeType};base64,${(0, utils_1.toBase64)(image)}`,
                        },
                    })),
                ],
            },
        ],
    };
}
function parseResponse(value) {
    if (!(0, utils_1.isRecord)(value) || !Array.isArray(value.choices)) {
        throw new errors_1.VisionProxyError('unsupported-response', (0, i18n_1.t)('vision.proxy.error.unsupportedOpenAIResponse'));
    }
    const choice = value.choices[0];
    const message = (0, utils_1.isRecord)(choice) ? choice.message : undefined;
    const content = (0, utils_1.isRecord)(message) ? message.content : undefined;
    const text = parseContent(content).trim();
    if (!text) {
        throw new errors_1.VisionProxyError('empty-response', (0, i18n_1.t)('vision.proxy.error.emptyResponse'));
    }
    return text;
}
function parseContent(content) {
    if (typeof content === 'string') {
        return content;
    }
    if (!Array.isArray(content)) {
        throw new errors_1.VisionProxyError('unsupported-response', (0, i18n_1.t)('vision.proxy.error.unsupportedOpenAIContent'));
    }
    return content
        .map((block) => {
        if (!(0, utils_1.isRecord)(block)) {
            return undefined;
        }
        if (typeof block.text === 'string') {
            return block.text;
        }
        if (typeof block.content === 'string') {
            return block.content;
        }
        return undefined;
    })
        .filter((item) => typeof item === 'string')
        .join('');
}
//# sourceMappingURL=chat.js.map