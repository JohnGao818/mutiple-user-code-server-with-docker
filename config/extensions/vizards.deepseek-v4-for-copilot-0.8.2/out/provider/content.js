"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepSeekContentToText = deepSeekContentToText;
exports.deepSeekMessageToText = deepSeekMessageToText;
function deepSeekContentToText(content, options = {}) {
    if (!content) {
        return '';
    }
    if (typeof content === 'string') {
        return content;
    }
    const includeImageUrls = options.includeImageUrls ?? false;
    const separator = options.separator ?? '';
    const parts = [];
    for (const part of content) {
        if (part.type === 'text') {
            parts.push(part.text);
            continue;
        }
        if (includeImageUrls && part.type === 'image_url') {
            parts.push(part.image_url.url);
        }
    }
    return parts.join(separator);
}
function deepSeekMessageToText(message, options) {
    return deepSeekContentToText(message.content, options);
}
//# sourceMappingURL=content.js.map