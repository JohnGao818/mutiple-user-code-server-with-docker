"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeToolResult = normalizeToolResult;
exports.collectVisionInputSummary = collectVisionInputSummary;
exports.isImageDataPart = isImageDataPart;
const vscode_1 = __importDefault(require("vscode"));
/**
 * Normalize a tool result without making any model-routing decisions.
 *
 * Only actual image data parts are classified as images. Tool names, tool-call
 * input paths, resource URIs, and other opaque values are deliberately not
 * inspected or hydrated here.
 */
function normalizeToolResult(part) {
    return {
        callId: part.callId,
        parts: part.content.map(normalizeToolResultContentPart),
        originalContent: part.content,
    };
}
/** Collect authoritative image metadata across supported provider input shapes. */
function collectVisionInputSummary(messages) {
    const inputMimeStats = new Map();
    const toolResultMimeStats = new Map();
    const messageIndexesWithInputImages = new Set();
    let inputImageParts = 0;
    let inputImageBytes = 0;
    let toolResultImageParts = 0;
    let toolResultImageBytes = 0;
    let toolResultsWithImages = 0;
    const recordInputImage = (part, messageIndex) => {
        const byteLength = part.data.byteLength;
        const mimeType = normalizeMimeType(part.mimeType);
        recordMimeStats(inputMimeStats, mimeType, byteLength);
        inputImageParts += 1;
        inputImageBytes += byteLength;
        messageIndexesWithInputImages.add(messageIndex);
    };
    const recordToolResultImage = (part) => {
        const byteLength = part.data.byteLength;
        const mimeType = normalizeMimeType(part.mimeType);
        recordMimeStats(toolResultMimeStats, mimeType, byteLength);
        toolResultImageParts += 1;
        toolResultImageBytes += byteLength;
    };
    for (const [messageIndex, message] of messages.entries()) {
        if (message.role !== vscode_1.default.LanguageModelChatMessageRole.User) {
            continue;
        }
        for (const part of message.content) {
            if (isImageDataPart(part)) {
                recordInputImage(part, messageIndex);
                continue;
            }
            if (!(part instanceof vscode_1.default.LanguageModelToolResultPart)) {
                continue;
            }
            let toolResultHasImages = false;
            for (const item of normalizeToolResult(part).parts) {
                if (item.type !== 'image') {
                    continue;
                }
                toolResultHasImages = true;
                recordToolResultImage(item);
            }
            if (toolResultHasImages) {
                toolResultsWithImages += 1;
            }
        }
    }
    return {
        inputImageParts,
        inputImageMessages: messageIndexesWithInputImages.size,
        inputImageBytes,
        inputImageMimes: sortMimeStats(inputMimeStats),
        toolResultImageParts,
        toolResultImageBytes,
        toolResultImageMimes: sortMimeStats(toolResultMimeStats),
        toolResultsWithImages,
    };
}
function isImageDataPart(part) {
    return (part instanceof vscode_1.default.LanguageModelDataPart && part.mimeType.toLowerCase().startsWith('image/'));
}
function normalizeToolResultContentPart(item) {
    if (item instanceof vscode_1.default.LanguageModelTextPart) {
        return { type: 'text', text: item.value };
    }
    if (isImageDataPart(item)) {
        return {
            type: 'image',
            mimeType: item.mimeType,
            data: item.data,
        };
    }
    return { type: 'other', value: item };
}
function normalizeMimeType(mimeType) {
    return mimeType.trim().toLowerCase() || 'unknown';
}
function recordMimeStats(stats, mimeType, byteLength) {
    const current = stats.get(mimeType);
    if (current) {
        current.imageParts += 1;
        current.imageBytes += byteLength;
        return;
    }
    stats.set(mimeType, {
        mimeType,
        imageParts: 1,
        imageBytes: byteLength,
    });
}
function sortMimeStats(stats) {
    return [...stats.values()].sort((a, b) => a.mimeType.localeCompare(b.mimeType));
}
//# sourceMappingURL=normalize.js.map