"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMessages = convertMessages;
exports.convertTools = convertTools;
exports.countMessageChars = countMessageChars;
const vscode_1 = __importDefault(require("vscode"));
const json_1 = require("../json");
const replay_1 = require("./replay");
const normalize_1 = require("./vision/normalize");
/**
 * Convert VS Code chat messages to DeepSeek format.
 * Injects marker-replayed reasoning_content for assistant messages.
 */
function convertMessages(messages, isThinkingModel, nativeImageInput) {
    const result = [];
    for (const message of messages) {
        const role = mapRole(message.role);
        let content = '';
        const nativeVisionContentParts = [];
        let thinkingContent = '';
        const toolCalls = [];
        const toolResults = [];
        for (const part of message.content) {
            if (part instanceof vscode_1.default.LanguageModelTextPart) {
                content += part.value;
                if (nativeImageInput && role === 'user') {
                    nativeVisionContentParts.push({
                        type: 'text',
                        text: part.value,
                    });
                }
            }
            else if (nativeImageInput && role === 'user' && (0, normalize_1.isImageDataPart)(part)) {
                nativeVisionContentParts.push({
                    type: 'image_url',
                    image_url: {
                        url: toImageDataUrl(part),
                    },
                });
            }
            else if (isLanguageModelThinkingPart(part)) {
                thinkingContent += normalizeThinkingPartText(part.value);
            }
            else if (part instanceof vscode_1.default.LanguageModelToolCallPart) {
                toolCalls.push({
                    id: part.callId,
                    type: 'function',
                    function: {
                        name: part.name,
                        arguments: (0, json_1.safeStringify)(part.input),
                    },
                });
            }
            else if (part instanceof vscode_1.default.LanguageModelToolResultPart) {
                toolResults.push((0, normalize_1.normalizeToolResult)(part));
            }
        }
        if (role === 'assistant') {
            if (content || toolCalls.length > 0) {
                const replayMarker = isThinkingModel ? (0, replay_1.parseFirstReplayMarker)(message) : undefined;
                const msg = {
                    role: 'assistant',
                    content: content || '',
                };
                if (toolCalls.length > 0) {
                    msg.tool_calls = toolCalls;
                }
                if (isThinkingModel) {
                    msg.reasoning_content = getReasoningContent(replayMarker, thinkingContent);
                }
                result.push(msg);
            }
        }
        else {
            if (nativeImageInput && role === 'user' && nativeVisionContentParts.length > 0) {
                result.push({
                    role: 'user',
                    content: nativeVisionContentParts,
                });
            }
            else if (content) {
                result.push({
                    role: role,
                    content: content,
                });
            }
        }
        // Tool result messages follow their associated assistant message
        for (const tr of toolResults) {
            result.push({
                role: 'tool',
                content: convertToolResultContent(tr, nativeImageInput),
                tool_call_id: tr.callId,
            });
        }
    }
    return result;
}
function toImageDataUrl(part) {
    return `data:${part.mimeType};base64,${Buffer.from(part.data).toString('base64')}`;
}
function convertToolResultContent(toolResult, nativeImageInput) {
    const hasImages = toolResult.parts.some((part) => part.type === 'image');
    if (!nativeImageInput || !hasImages) {
        const text = toolResult.parts
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('');
        if (text) {
            return text;
        }
        // Do not stringify image bytes into a text-only model request. Preserve the
        // existing fallback for genuinely non-image tool-result content.
        const fallbackContent = hasImages
            ? toolResult.parts.filter((part) => part.type === 'other').map((part) => part.value)
            : toolResult.originalContent;
        return fallbackContent.length > 0 ? (0, json_1.safeStringify)(fallbackContent) : '';
    }
    const content = [];
    for (const part of toolResult.parts) {
        if (part.type === 'text') {
            content.push({ type: 'text', text: part.text });
        }
        else if (part.type === 'image') {
            content.push({
                type: 'image_url',
                image_url: { url: toImageDataUrl(part) },
            });
        }
    }
    return content;
}
function getReasoningContent(replayMarker, thinkingContent) {
    if (replayMarker?.valid && replayMarker.reasoningText) {
        return replayMarker.reasoningText;
    }
    return thinkingContent;
}
function isLanguageModelThinkingPart(part) {
    return (typeof vscode_1.default.LanguageModelThinkingPart === 'function' &&
        part instanceof vscode_1.default.LanguageModelThinkingPart);
}
function normalizeThinkingPartText(value) {
    return Array.isArray(value) ? value.join('') : value;
}
function mapRole(role) {
    switch (role) {
        case vscode_1.default.LanguageModelChatMessageRole.User:
            return 'user';
        case vscode_1.default.LanguageModelChatMessageRole.Assistant:
            return 'assistant';
        default:
            return 'user';
    }
}
/**
 * Convert VS Code tool definitions to DeepSeek format.
 */
function convertTools(tools) {
    if (!tools || tools.length === 0) {
        return undefined;
    }
    return tools.map((tool) => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
        },
    }));
}
/**
 * Count total characters across all messages to calibrate chars-per-token ratio.
 */
function countMessageChars(messages) {
    let total = 0;
    for (const msg of messages) {
        total += getMessageContentChars(msg.content);
        total += msg.reasoning_content?.length ?? 0;
        if (msg.tool_calls) {
            for (const tc of msg.tool_calls) {
                total += tc.function?.name?.length ?? 0;
                total += tc.function?.arguments?.length ?? 0;
            }
        }
    }
    return total;
}
function getMessageContentChars(content) {
    if (typeof content === 'string') {
        return content.length;
    }
    let total = 0;
    for (const part of content) {
        if (part.type === 'text') {
            total += part.text.length;
        }
        else if (part.type === 'image_url') {
            // Do not count base64 URL chars. Native-image requests are excluded from
            // adaptive charsPerToken updates, and image cost is handled separately.
            total += 0;
        }
    }
    return total;
}
//# sourceMappingURL=convert.js.map