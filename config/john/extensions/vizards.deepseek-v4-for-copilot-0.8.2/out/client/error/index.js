"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekRequestError = void 0;
exports.setErrorActionUrl = setErrorActionUrl;
exports.createHttpError = createHttpError;
exports.normalizeRequestError = normalizeRequestError;
exports.formatRequestError = formatRequestError;
exports.createUserFacingError = createUserFacingError;
const endpoint_1 = require("../../endpoint");
const i18n_1 = require("../../i18n");
const json_1 = require("../../json");
const consts_1 = require("../consts");
const network_1 = require("./network");
const errorActionUrlStore = (() => {
    let current = {};
    return {
        get: () => current,
        set: (key, url) => {
            current = { ...current, [key]: url };
        },
    };
})();
function setErrorActionUrl(key, url) {
    errorActionUrlStore.set(key, url);
}
class DeepSeekRequestError extends Error {
    kind;
    userSummary;
    diagnosticMessage;
    baseUrl;
    status;
    code;
    constructor(options) {
        super(options.message, { cause: options.cause });
        this.name = 'DeepSeekRequestError';
        this.kind = options.kind;
        this.userSummary = options.userSummary ?? options.message;
        this.diagnosticMessage = options.diagnosticMessage ?? options.message;
        this.baseUrl = options.baseUrl;
        this.status = options.status;
        this.code = options.code;
    }
}
exports.DeepSeekRequestError = DeepSeekRequestError;
async function createHttpError(response, context) {
    const { baseUrl } = context;
    const responseText = await response.text();
    const serverMessage = extractServerMessage(responseText);
    const userSummary = getHttpErrorMessage(response.status, getCreateApiKeyUrl(response.status, baseUrl));
    return new DeepSeekRequestError({
        message: `DeepSeek API request failed with HTTP ${response.status}`,
        userSummary,
        kind: 'http',
        baseUrl,
        status: response.status,
        code: `HTTP_${response.status}`,
        diagnosticMessage: joinDiagnosticParts(`kind=http`, `status=${response.status}`, getRequestDiagnosticMessage(context), `statusText=${(0, json_1.safeStringify)(response.statusText || 'unknown')}`, serverMessage ? `serverMessage=${(0, json_1.safeStringify)(serverMessage)}` : undefined, responseText && responseText !== serverMessage
            ? `body=${(0, json_1.safeStringify)(truncateSingleLine(responseText))}`
            : undefined),
    });
}
function normalizeRequestError(error, context) {
    if (error instanceof DeepSeekRequestError) {
        return error;
    }
    if (!(error instanceof Error)) {
        const value = truncateSingleLine(String(error));
        return new DeepSeekRequestError({
            message: `DeepSeek request failed with a non-Error value: ${value}`,
            userSummary: (0, i18n_1.t)('error.unknown', value),
            kind: 'unknown',
            baseUrl: context.baseUrl,
            diagnosticMessage: joinDiagnosticParts(`kind=unknown`, getRequestDiagnosticMessage(context), `error=${(0, json_1.safeStringify)(value)}`),
        });
    }
    const causeInfo = (0, network_1.getNetworkErrorCauseInfo)(error);
    if (!causeInfo) {
        return error;
    }
    const code = (0, network_1.getNetworkErrorCode)(causeInfo);
    const userSummary = (0, network_1.getNetworkErrorMessage)(code);
    const enhanced = new DeepSeekRequestError({
        message: code
            ? `DeepSeek request failed due to network error ${code}`
            : 'DeepSeek request failed due to a network error',
        userSummary,
        kind: 'network',
        baseUrl: context.baseUrl,
        code,
        cause: error,
        diagnosticMessage: joinDiagnosticParts(`kind=network`, code ? `code=${code}` : undefined, getRequestDiagnosticMessage(context), `message=${(0, json_1.safeStringify)(truncateSingleLine(error.message))}`, `cause=${causeInfo.value}`),
    });
    enhanced.stack = error.stack;
    return enhanced;
}
function formatRequestError(error) {
    const diagnosticMessage = joinDiagnosticParts(error instanceof DeepSeekRequestError
        ? error.diagnosticMessage
        : `message=${(0, json_1.safeStringify)(error.message)}`);
    return error.stack ? `${diagnosticMessage}\n${error.stack}` : diagnosticMessage;
}
function createUserFacingError(error) {
    const message = error instanceof DeepSeekRequestError
        ? formatMarkdownMessage(error.userSummary, getErrorActions(error, errorActionUrlStore.get()))
        : error.message;
    const displayError = new Error(message);
    displayError.stack = undefined;
    return displayError;
}
function getHttpErrorMessage(status, createApiKeyUrl) {
    switch (status) {
        case 400:
            return (0, i18n_1.t)('error.http.400', status);
        case 401:
            return createApiKeyUrl
                ? (0, i18n_1.t)('error.http.401.withCreateApiKeyLink', status, createApiKeyUrl)
                : (0, i18n_1.t)('error.http.401', status);
        case 402:
            return (0, i18n_1.t)('error.http.402', status);
        case 422:
            return (0, i18n_1.t)('error.http.422', status);
        case 429:
            return (0, i18n_1.t)('error.http.429', status);
        case 500:
            return (0, i18n_1.t)('error.http.500', status);
        case 503:
            return (0, i18n_1.t)('error.http.503', status);
        default:
            return (0, i18n_1.t)('error.http.generic', status);
    }
}
function extractServerMessage(responseText) {
    const trimmed = responseText.trim();
    if (!trimmed) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(trimmed);
        const error = getObjectProperty(parsed, 'error');
        const message = getStringProperty(error, 'message') ??
            getStringProperty(parsed, 'message') ??
            (typeof error === 'string' ? error : undefined);
        return message ? truncateSingleLine(message) : undefined;
    }
    catch {
        return truncateSingleLine(trimmed);
    }
}
function getObjectProperty(value, key) {
    return typeof value === 'object' && value !== null
        ? value[key]
        : undefined;
}
function getStringProperty(value, key) {
    const property = getObjectProperty(value, key);
    return typeof property === 'string' && property.length > 0 ? property : undefined;
}
function formatMarkdownMessage(summary, actions = undefined) {
    const formattedSummary = `**${escapeBoldText(summary)}**`;
    const actionLinks = actions?.map(formatActionLink).join(' · ');
    return actionLinks
        ? [formattedSummary + '\\', '\\', `**${actionLinks}**`].join('\n')
        : formattedSummary;
}
function formatActionLink(action) {
    return `[${(0, i18n_1.t)(action.labelKey)}](${action.url})`;
}
function getErrorActions(error, actionUrls) {
    if (error.kind === 'http' && error.status !== undefined && error.baseUrl) {
        return getHttpErrorActions(error.status, error.baseUrl, actionUrls);
    }
    return getDiagnosticErrorActions(actionUrls);
}
function getHttpErrorActions(status, baseUrl, actionUrls) {
    return [
        ...getUniversalHttpErrorActions(status, actionUrls),
        ...getProviderHttpErrorActions(status, baseUrl),
        ...getDiagnosticErrorActions(actionUrls),
    ];
}
function getUniversalHttpErrorActions(status, actionUrls) {
    const url = actionUrls.configureApiKey;
    return status === 401 && url ? [{ labelKey: 'error.action.setApiKey', url }] : [];
}
function getProviderHttpErrorActions(status, baseUrl) {
    if (status === 401) {
        return [];
    }
    const link = getProviderHttpErrorLink(status, baseUrl);
    return link ? [{ labelKey: link.labelKey, url: link.url }] : [];
}
function getProviderHttpErrorLink(status, baseUrl) {
    const providerId = identifyApiProvider(baseUrl);
    const statusKey = getHttpErrorLinkStatusKey(status);
    return providerId && statusKey ? consts_1.API_PROVIDER_HTTP_ERROR_LINKS[statusKey][providerId] : undefined;
}
function getCreateApiKeyUrl(status, baseUrl) {
    return status === 401 ? getProviderHttpErrorLink(status, baseUrl)?.url : undefined;
}
function getDiagnosticErrorActions(actionUrls) {
    const url = actionUrls.showLogs;
    return url ? [{ labelKey: 'error.action.viewDetails', url }] : [];
}
function getRequestDiagnosticMessage(context) {
    const { request } = context;
    return joinDiagnosticParts(`baseUrl=${(0, json_1.safeStringify)(context.baseUrl)}`, `model=${(0, json_1.safeStringify)(request.model)}`, `stream=${request.stream}`, request.temperature !== undefined ? `temperature=${request.temperature}` : undefined, request.top_p !== undefined ? `topP=${request.top_p}` : undefined, request.max_tokens !== undefined ? `maxTokens=${request.max_tokens}` : undefined, request.thinking?.type ? `thinking=${(0, json_1.safeStringify)(request.thinking.type)}` : undefined, request.reasoning_effort
        ? `reasoningEffort=${(0, json_1.safeStringify)(request.reasoning_effort)}`
        : undefined, request.tool_choice ? `toolChoice=${(0, json_1.safeStringify)(request.tool_choice)}` : undefined, `toolCount=${request.tools?.length ?? 0}`, `messageCount=${request.messages.length}`, `messageChars=${request.messages.reduce((total, message) => total + getContentChars(message.content), 0)}`, `imageParts=${request.messages.reduce((total, message) => total + countImageParts(message.content), 0)}`);
}
/**
 * Measure only the content values sent to the API. Serializing a multimodal
 * content array would also count JSON keys and punctuation, making this
 * diagnostic depend on the object representation rather than payload content.
 * Image URL characters are included because data URLs can dominate request size.
 */
function getContentChars(content) {
    if (typeof content === 'string') {
        return content.length;
    }
    return content.reduce((total, part) => total + (part.type === 'text' ? part.text.length : part.image_url.url.length), 0);
}
/**
 * Report image presence separately because messageChars alone cannot distinguish
 * a large data URL from a long text prompt. Counting parts avoids logging or
 * decoding image payloads while still making multimodal request failures useful.
 */
function countImageParts(content) {
    if (typeof content === 'string') {
        return 0;
    }
    return content.filter((part) => part.type === 'image_url').length;
}
function joinDiagnosticParts(...parts) {
    return parts.filter(Boolean).join(' ');
}
function truncateSingleLine(value) {
    const singleLine = value.replace(/\s+/g, ' ').trim();
    return singleLine.length > consts_1.MAX_DIAGNOSTIC_FIELD_LENGTH
        ? `${singleLine.slice(0, consts_1.MAX_DIAGNOSTIC_FIELD_LENGTH)}...`
        : singleLine;
}
function escapeBoldText(value) {
    return value.replace(/\*/g, '\\*');
}
function identifyApiProvider(baseUrl) {
    return (0, endpoint_1.isOfficialDeepSeekBaseUrl)(baseUrl) ? 'deepseek' : undefined;
}
function getHttpErrorLinkStatusKey(status) {
    if (status === 401 || status === 402) {
        return status;
    }
    return status >= 500 && status <= 599 ? '5xx' : undefined;
}
//# sourceMappingURL=index.js.map