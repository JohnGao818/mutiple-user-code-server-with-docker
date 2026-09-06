"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisionProxyError = void 0;
exports.createHttpVisionProxyError = createHttpVisionProxyError;
exports.createVisionProxyRequestError = createVisionProxyRequestError;
exports.addVisionProxyDiagnostics = addVisionProxyDiagnostics;
exports.formatVisionProxyError = formatVisionProxyError;
exports.getVisionProxyErrorDisplayCode = getVisionProxyErrorDisplayCode;
exports.formatVisionProxyDisplayMessage = formatVisionProxyDisplayMessage;
exports.formatVisionProxyErrorCode = formatVisionProxyErrorCode;
exports.isVisionProxyError = isVisionProxyError;
const consts_1 = require("../../../client/consts");
const network_1 = require("../../../client/error/network");
const i18n_1 = require("../../../i18n");
const json_1 = require("../../../json");
class VisionProxyError extends Error {
    code;
    status;
    cause;
    diagnosticMessage;
    constructor(code, message, status, cause, diagnosticMessage = joinDiagnosticParts(status !== undefined ? `kind=http` : `kind=vision`, status === undefined ? `code=${code}` : undefined, status !== undefined ? `status=${status}` : undefined, cause ? `cause=${formatDiagnosticValue(cause)}` : undefined)) {
        super(message);
        this.code = code;
        this.status = status;
        this.cause = cause;
        this.diagnosticMessage = diagnosticMessage;
        this.name = 'VisionProxyError';
    }
}
exports.VisionProxyError = VisionProxyError;
async function createHttpVisionProxyError(response, context) {
    const responseText = await response.text();
    const serverMessage = extractServerMessage(responseText);
    const target = context.endpoint
        ? `${context.endpoint.host}${context.endpoint.pathname}`
        : 'unknown';
    const status = response.status;
    if (status === 401 || status === 403) {
        return new VisionProxyError('http-auth', (0, i18n_1.t)('vision.proxy.error.auth', status), status, undefined, createHttpDiagnosticMessage('http-auth', response, context, serverMessage, responseText));
    }
    if (status === 404) {
        return new VisionProxyError('http-not-found', (0, i18n_1.t)('vision.proxy.error.notFound', target), status, undefined, createHttpDiagnosticMessage('http-not-found', response, context, serverMessage, responseText));
    }
    if (status === 413) {
        return new VisionProxyError('http-payload-too-large', (0, i18n_1.t)('vision.proxy.error.payloadTooLarge', status), status, undefined, createHttpDiagnosticMessage('http-payload-too-large', response, context, serverMessage, responseText));
    }
    if (status === 429) {
        return new VisionProxyError('http-rate-limited', (0, i18n_1.t)('vision.proxy.error.rateLimited', status), status, undefined, createHttpDiagnosticMessage('http-rate-limited', response, context, serverMessage, responseText));
    }
    if (status >= 500) {
        return new VisionProxyError('http-provider', (0, i18n_1.t)('vision.proxy.error.providerUnavailable', status), status, undefined, createHttpDiagnosticMessage('http-provider', response, context, serverMessage, responseText));
    }
    return new VisionProxyError('http-provider', (0, i18n_1.t)('vision.proxy.error.requestFailed', status), status, undefined, createHttpDiagnosticMessage('http-provider', response, context, serverMessage, responseText));
}
function createVisionProxyRequestError(code, message, context, cause) {
    return new VisionProxyError(code, message, undefined, cause, createDiagnosticMessage(code, context, cause));
}
function addVisionProxyDiagnostics(error, context) {
    const enhanced = new VisionProxyError(error.code, error.message, error.status, error.cause, createDiagnosticMessage(error.code, context, error.cause, error.status));
    enhanced.stack = error.stack;
    return enhanced;
}
function formatVisionProxyError(error) {
    if (error instanceof VisionProxyError) {
        return error.stack ? `${error.diagnosticMessage}\n${error.stack}` : error.diagnosticMessage;
    }
    if (error instanceof Error) {
        const message = joinDiagnosticParts(`kind=unknown`, `message=${safeDiagnosticString(error.message)}`, error.cause !== undefined ? `cause=${formatDiagnosticCause(error.cause)}` : undefined);
        return error.stack ? `${message}\n${error.stack}` : message;
    }
    return joinDiagnosticParts(`kind=unknown`, `value=${formatDiagnosticValue(error)}`);
}
function getVisionProxyErrorDisplayCode(error) {
    if (error instanceof VisionProxyError) {
        if (error.status !== undefined) {
            return String(error.status);
        }
        const causeInfo = error.cause instanceof Error && !(error.cause instanceof VisionProxyError)
            ? (0, network_1.getNetworkErrorCauseInfo)(error.cause)
            : undefined;
        return (0, network_1.getNetworkErrorCode)(causeInfo) ?? getFallbackVisionProxyErrorCode(error.code);
    }
    if (error instanceof Error) {
        return (0, network_1.getNetworkErrorCode)((0, network_1.getNetworkErrorCauseInfo)(error)) ?? 'UNKNOWN';
    }
    return 'UNKNOWN';
}
function formatVisionProxyDisplayMessage(errorCode, errorMessage) {
    const normalizedErrorCode = normalizeVisionProxyDisplayCode(errorCode);
    return `[${normalizedErrorCode}] ${stripTrailingErrorCode(errorMessage, normalizedErrorCode)}`;
}
function formatVisionProxyErrorCode(code) {
    return code.toUpperCase().replaceAll('-', '_');
}
function isVisionProxyError(error) {
    return error instanceof VisionProxyError;
}
function createHttpDiagnosticMessage(code, response, context, serverMessage, responseText) {
    return joinDiagnosticParts(createDiagnosticMessage(code, context, undefined, response.status), `statusText=${safeDiagnosticString(response.statusText || 'unknown')}`, serverMessage ? `serverMessage=${safeDiagnosticString(serverMessage)}` : undefined, responseText && responseText !== serverMessage
        ? `body=${safeDiagnosticString(responseText)}`
        : undefined);
}
function createDiagnosticMessage(code, context, cause, status) {
    const kind = getDiagnosticKind(code, status);
    const causeInfo = cause instanceof Error ? (0, network_1.getNetworkErrorCauseInfo)(cause) : undefined;
    const networkCode = (0, network_1.getNetworkErrorCode)(causeInfo);
    return joinDiagnosticParts(`kind=${kind}`, kind === 'network' ? `code=${networkCode ?? getFallbackNetworkCode(code)}` : undefined, status !== undefined ? `status=${status}` : undefined, `phase=${context.phase}`, `providerFamily=${safeDiagnosticString(context.providerFamily)}`, `apiType=${safeDiagnosticString(context.apiType)}`, `model=${safeDiagnosticString(context.modelId)}`, context.endpoint ? `endpoint=${safeDiagnosticString(context.endpoint.toString())}` : undefined, context.timeoutMs !== undefined ? `timeoutMs=${context.timeoutMs}` : undefined, context.hasApiKey !== undefined ? `hasApiKey=${context.hasApiKey}` : undefined, context.headerNames ? `headerNames=${formatDiagnosticValue(context.headerNames)}` : undefined, context.imageCount !== undefined ? `imageCount=${context.imageCount}` : undefined, context.imageBytes !== undefined ? `imageBytes=${context.imageBytes}` : undefined, context.promptChars !== undefined ? `promptChars=${context.promptChars}` : undefined, context.bodyBytes !== undefined ? `bodyBytes=${context.bodyBytes}` : undefined, cause instanceof Error ? `message=${safeDiagnosticString(cause.message)}` : undefined, cause ? `cause=${formatDiagnosticCause(cause)}` : undefined);
}
function getDiagnosticKind(code, status) {
    if (status !== undefined || code.startsWith('http-')) {
        return 'http';
    }
    if (code === 'network' || code === 'timeout') {
        return 'network';
    }
    if (code === 'cancelled') {
        return 'cancelled';
    }
    return 'vision';
}
function getFallbackNetworkCode(code) {
    return code === 'timeout' ? 'TIMEOUT' : 'UNKNOWN';
}
function getFallbackVisionProxyErrorCode(code) {
    return code === 'network' || code === 'timeout'
        ? getFallbackNetworkCode(code)
        : formatVisionProxyErrorCode(code);
}
function normalizeVisionProxyDisplayCode(errorCode) {
    return errorCode.replace(/[\r\n[\]]/gu, '').trim() || 'UNKNOWN';
}
function stripTrailingErrorCode(errorMessage, errorCode) {
    const escapedErrorCode = escapeRegExp(errorCode);
    return errorMessage.replace(new RegExp(`\\s*\\(${escapedErrorCode}\\)([。.]?)$`, 'u'), '$1');
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
function extractServerMessage(responseText) {
    if (!responseText) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(responseText);
        return findServerMessage(parsed);
    }
    catch {
        return truncateSingleLine(responseText);
    }
}
function findServerMessage(value) {
    if (typeof value === 'string') {
        return truncateSingleLine(value);
    }
    if (!isRecord(value)) {
        return undefined;
    }
    const direct = getStringProperty(value, 'message') ?? getStringProperty(value, 'detail');
    if (direct) {
        return truncateSingleLine(direct);
    }
    const error = value.error;
    if (isRecord(error)) {
        const nested = getStringProperty(error, 'message') ?? getStringProperty(error, 'detail');
        if (nested) {
            return truncateSingleLine(nested);
        }
    }
    return undefined;
}
function formatDiagnosticCause(cause) {
    if (cause instanceof Error) {
        return ((0, network_1.getNetworkErrorCauseInfo)(cause)?.value ??
            formatDiagnosticValue({
                name: cause.name,
                message: cause.message,
                ...Object.fromEntries(Object.entries(cause)),
            }));
    }
    return formatDiagnosticValue(cause);
}
function formatDiagnosticValue(value) {
    try {
        return truncateSingleLine((0, json_1.safeStringify)(value));
    }
    catch {
        return safeDiagnosticString(String(value));
    }
}
function safeDiagnosticString(value) {
    return (0, json_1.safeStringify)(truncateSingleLine(value));
}
function truncateSingleLine(value) {
    const singleLine = value.replace(/\s+/gu, ' ').trim();
    return singleLine.length > consts_1.MAX_DIAGNOSTIC_FIELD_LENGTH
        ? `${singleLine.slice(0, consts_1.MAX_DIAGNOSTIC_FIELD_LENGTH)}...`
        : singleLine;
}
function getStringProperty(value, key) {
    const property = value[key];
    return typeof property === 'string' && property.length > 0 ? property : undefined;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function joinDiagnosticParts(...parts) {
    return parts.filter(Boolean).join(' ');
}
//# sourceMappingURL=errors.js.map