"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIResponsesAdapter = void 0;
const i18n_1 = require("../../../../../i18n");
const errors_1 = require("../../errors");
const utils_1 = require("../utils");
exports.openAIResponsesAdapter = {
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
        input: [
            {
                role: 'user',
                content: [
                    { type: 'input_text', text: request.prompt },
                    ...request.images.map((image) => ({
                        type: 'input_image',
                        detail: 'auto',
                        image_url: `data:${image.mimeType};base64,${(0, utils_1.toBase64)(image)}`,
                    })),
                ],
            },
        ],
    };
}
function parseResponse(value) {
    if (!(0, utils_1.isRecord)(value)) {
        throw new errors_1.VisionProxyError('unsupported-response', (0, i18n_1.t)('vision.proxy.error.unsupportedOpenAIResponse'));
    }
    if (typeof value.output_text === 'string' && value.output_text.trim()) {
        return value.output_text.trim();
    }
    const text = parseOutput(value.output).trim();
    if (!text) {
        throw new errors_1.VisionProxyError('empty-response', (0, i18n_1.t)('vision.proxy.error.emptyResponse'));
    }
    return text;
}
function parseOutput(output) {
    if (!Array.isArray(output)) {
        throw new errors_1.VisionProxyError('unsupported-response', (0, i18n_1.t)('vision.proxy.error.unsupportedOpenAIResponse'));
    }
    return output
        .map((item) => {
        if (!(0, utils_1.isRecord)(item)) {
            return undefined;
        }
        if (typeof item.text === 'string') {
            return item.text;
        }
        if (typeof item.content === 'string') {
            return item.content;
        }
        if (Array.isArray(item.content)) {
            return parseContent(item.content);
        }
        return undefined;
    })
        .filter((item) => typeof item === 'string')
        .join('');
}
function parseContent(content) {
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
//# sourceMappingURL=responses.js.map