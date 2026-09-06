"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showVisionLogs = showVisionLogs;
exports.logVSCodeVisionModelSelected = logVSCodeVisionModelSelected;
exports.logVSCodeVisionModelNotFound = logVSCodeVisionModelNotFound;
exports.logVisionApiEndpointSelected = logVisionApiEndpointSelected;
exports.logInvalidVisionProxyApiEndpointConfig = logInvalidVisionProxyApiEndpointConfig;
exports.logVisionProxyUnavailable = logVisionProxyUnavailable;
exports.logVisionProxyDescribeFailed = logVisionProxyDescribeFailed;
exports.logVisionProxyTestSucceeded = logVisionProxyTestSucceeded;
exports.logVisionProxyTestFailed = logVisionProxyTestFailed;
const i18n_1 = require("../../i18n");
const json_1 = require("../../json");
const logger_1 = require("../../logger");
const errors_1 = require("./protocols/errors");
const model_1 = require("./sources/vscode/model");
function showVisionLogs() {
    logger_1.logger.show();
}
function logVSCodeVisionModelSelected(model) {
    logger_1.logger.info(`${(0, i18n_1.t)('vision.proxyUsing', model.id)} selected=${formatVSCodeVisionModelIdentity(model)}`);
}
function logVSCodeVisionModelNotFound(modelId) {
    logger_1.logger.warn((0, i18n_1.t)('vision.notFound', modelId));
}
function logVisionApiEndpointSelected(modelId) {
    logger_1.logger.info(`Vision proxy: ${modelId} source=api-endpoint`);
}
function logInvalidVisionProxyApiEndpointConfig(source, explicitApiEndpointSource, error) {
    logger_1.logger.warn(`Invalid vision proxy API endpoint configuration; source=${source ?? 'unset'} fallback=${explicitApiEndpointSource ? 'none' : 'vscode-lm'}`, error);
}
function logVisionProxyUnavailable() {
    logger_1.logger.warn((0, i18n_1.t)('vision.unavailable'));
}
function logVisionProxyDescribeFailed(error) {
    logger_1.logger.error((0, i18n_1.t)('vision.proxyError'), (0, errors_1.formatVisionProxyError)(error));
}
function logVisionProxyTestSucceeded(config, apiKey, description) {
    logger_1.logger.info('Vision proxy test succeeded:', formatVisionProxyTestDiagnostics(config, apiKey, description));
}
function logVisionProxyTestFailed(error) {
    logger_1.logger.error('Vision proxy test failed:', (0, errors_1.formatVisionProxyError)(error));
}
function formatVSCodeVisionModelIdentity(model) {
    return [
        formatLogField('id', model.id),
        formatLogField('vendor', model.vendor),
        formatLogField('name', model.name),
        formatLogField('family', model.family),
        formatLogField('version', model.version),
        formatLogField('targetChatSessionType', (0, model_1.getVSCodeVisionTargetChatSessionType)(model)),
    ].join(' ');
}
function formatLogField(name, value) {
    return `${name}=${formatLogValue(value)}`;
}
function formatLogValue(value) {
    const text = asString(value);
    return text ? JSON.stringify(text) : 'n/a';
}
function formatVisionProxyTestDiagnostics(config, apiKey, description) {
    return joinDiagnosticParts(`kind=vision`, `phase=describe`, `providerFamily=${(0, json_1.safeStringify)(config.providerFamily)}`, `apiType=${(0, json_1.safeStringify)(config.apiType)}`, `model=${(0, json_1.safeStringify)(config.modelId)}`, `endpoint=${(0, json_1.safeStringify)(config.url)}`, `hasApiKey=${Boolean(apiKey?.trim())}`, `responseChars=${description.length}`, config.headers ? `headerNames=${(0, json_1.safeStringify)(Object.keys(config.headers).sort())}` : undefined);
}
function joinDiagnosticParts(...parts) {
    return parts.filter(Boolean).join(' ');
}
function asString(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
//# sourceMappingURL=log.js.map