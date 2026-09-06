"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNetworkErrorCauseInfo = getNetworkErrorCauseInfo;
exports.getNetworkErrorCode = getNetworkErrorCode;
exports.getNetworkErrorMessage = getNetworkErrorMessage;
exports.getNetworkErrorCategory = getNetworkErrorCategory;
const i18n_1 = require("../../i18n");
const json_1 = require("../../json");
const consts_1 = require("../consts");
function getNetworkErrorCauseInfo(error) {
    const cause = error.cause;
    if (!cause) {
        return undefined;
    }
    if (cause instanceof Error) {
        const value = {
            name: cause.name,
            message: cause.message,
            ...Object.fromEntries(Object.entries(cause)),
        };
        return {
            code: getStringProperty(value, 'code'),
            name: cause.name,
            message: cause.message && cause.message !== error.message
                ? truncateSingleLine(cause.message)
                : undefined,
            value: stringifyDiagnosticCause(value),
        };
    }
    if (typeof cause === 'object') {
        return {
            code: getStringProperty(cause, 'code'),
            name: getStringProperty(cause, 'name'),
            message: truncateOptional(getStringProperty(cause, 'message')),
            value: stringifyDiagnosticCause(cause),
        };
    }
    return { message: truncateSingleLine(String(cause)), value: (0, json_1.safeStringify)(String(cause)) };
}
function getNetworkErrorCode(info) {
    return info?.code ?? info?.name;
}
function getNetworkErrorMessage(code) {
    const errorCode = code ?? 'UNKNOWN';
    switch (getNetworkErrorCategory(code)) {
        case 'dns':
            return (0, i18n_1.t)('error.network.dns', errorCode);
        case 'unreachable':
            return (0, i18n_1.t)('error.network.unreachable', errorCode);
        case 'interrupted':
            return (0, i18n_1.t)('error.network.interrupted', errorCode);
        case 'timeout':
            return (0, i18n_1.t)('error.network.timeout', errorCode);
        case 'tls':
            return (0, i18n_1.t)('error.network.tls', errorCode);
        case 'aborted':
            return (0, i18n_1.t)('error.network.aborted', errorCode);
        case 'protocol':
            return (0, i18n_1.t)('error.network.protocol', errorCode);
        case 'configuration':
            return (0, i18n_1.t)('error.network.configuration', errorCode);
        case 'generic':
            return (0, i18n_1.t)('error.network.generic', errorCode);
    }
}
function getNetworkErrorCategory(code) {
    if (!code) {
        return 'generic';
    }
    if (isKnownNetworkErrorCode(code)) {
        return consts_1.NETWORK_ERROR_CATEGORY_BY_CODE[code];
    }
    if (code.startsWith('ERR_TLS_') || code.startsWith('ERR_SSL_')) {
        return 'tls';
    }
    return code.startsWith('HPE_') ? 'protocol' : 'generic';
}
function isKnownNetworkErrorCode(code) {
    return Object.hasOwn(consts_1.NETWORK_ERROR_CATEGORY_BY_CODE, code);
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
function truncateSingleLine(value) {
    const singleLine = value.replace(/\s+/gu, ' ').trim();
    return singleLine.length > consts_1.MAX_DIAGNOSTIC_FIELD_LENGTH
        ? `${singleLine.slice(0, consts_1.MAX_DIAGNOSTIC_FIELD_LENGTH)}...`
        : singleLine;
}
function truncateOptional(value) {
    return value ? truncateSingleLine(value) : undefined;
}
function stringifyDiagnosticCause(cause) {
    try {
        return truncateSingleLine((0, json_1.safeStringify)(cause));
    }
    catch {
        return (0, json_1.safeStringify)(String(cause));
    }
}
//# sourceMappingURL=network.js.map