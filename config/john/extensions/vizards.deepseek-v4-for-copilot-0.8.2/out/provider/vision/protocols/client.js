"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisionProxyClient = void 0;
const network_1 = require("../../../client/error/network");
const i18n_1 = require("../../../i18n");
const json_1 = require("../../../json");
const errors_1 = require("./errors");
const headers_1 = require("./headers");
const providers_1 = require("./providers");
const url_1 = require("./url");
const DEFAULT_TIMEOUT_MS = 30_000;
class VisionProxyClient {
    async describe(config, apiKey, request) {
        if (request.token.isCancellationRequested) {
            throw new errors_1.VisionProxyError('cancelled', (0, i18n_1.t)('vision.proxy.error.cancelled'));
        }
        const endpoint = (0, url_1.resolveVisionEndpoint)(config);
        const adapter = (0, providers_1.getVisionProviderAdapter)(config);
        const body = adapter.createBody(config, request);
        const headers = (0, headers_1.createProviderHeaders)(config, apiKey?.trim() || undefined);
        const context = createVisionProxyRequestDiagnostics('describe', config, endpoint, headers, request, apiKey);
        const responseValue = await postJson(endpoint, {
            context,
            headers,
            body,
            timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            token: request.token,
        });
        try {
            return adapter.parseResponse(responseValue);
        }
        catch (error) {
            if (error instanceof errors_1.VisionProxyError) {
                throw (0, errors_1.addVisionProxyDiagnostics)(error, context);
            }
            throw error;
        }
    }
}
exports.VisionProxyClient = VisionProxyClient;
async function postJson(endpoint, options) {
    return postJsonRequest(endpoint, options, async (response) => {
        const responseText = await response.text();
        try {
            return JSON.parse(responseText);
        }
        catch (error) {
            throw (0, errors_1.createVisionProxyRequestError)('unsupported-response', getUnsupportedResponseMessage(options.context), options.context, error);
        }
    });
}
async function postJsonRequest(endpoint, options, readResponse) {
    const controller = new AbortController();
    let timeoutReached = false;
    const timeout = setTimeout(() => {
        timeoutReached = true;
        controller.abort();
    }, options.timeoutMs);
    const cancelListener = options.token.onCancellationRequested(() => {
        controller.abort();
    });
    try {
        const bodyText = (0, json_1.safeStringify)(options.body);
        options.context.bodyBytes = Buffer.byteLength(bodyText, 'utf8');
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: options.headers,
            body: bodyText,
            signal: controller.signal,
        });
        if (!response.ok) {
            throw await (0, errors_1.createHttpVisionProxyError)(response, options.context);
        }
        return await readResponse(response);
    }
    catch (error) {
        if (options.token.isCancellationRequested) {
            throw (0, errors_1.createVisionProxyRequestError)('cancelled', (0, i18n_1.t)('vision.proxy.error.cancelled'), options.context, error);
        }
        if (timeoutReached) {
            throw (0, errors_1.createVisionProxyRequestError)('timeout', (0, i18n_1.t)('vision.proxy.error.timeout'), options.context, error);
        }
        if (error instanceof errors_1.VisionProxyError) {
            throw error;
        }
        if (isAbortError(error)) {
            throw createVisionProxyNetworkError(error, options.context, 'aborted');
        }
        throw createVisionProxyNetworkError(error, options.context);
    }
    finally {
        clearTimeout(timeout);
        cancelListener.dispose();
    }
}
function createVisionProxyNetworkError(error, context, forcedCategory) {
    const causeInfo = error instanceof Error ? (0, network_1.getNetworkErrorCauseInfo)(error) : undefined;
    const code = (0, network_1.getNetworkErrorCode)(causeInfo);
    const category = forcedCategory ?? (0, network_1.getNetworkErrorCategory)(code);
    const displayCode = code ?? 'UNKNOWN';
    if (category === 'timeout') {
        return (0, errors_1.createVisionProxyRequestError)('timeout', (0, i18n_1.t)('vision.proxy.error.network.timeout', displayCode), context, error);
    }
    return (0, errors_1.createVisionProxyRequestError)('network', (0, i18n_1.t)(`vision.proxy.error.network.${category}`, displayCode), context, error);
}
function createVisionProxyRequestDiagnostics(phase, config, endpoint, headers, request, apiKey) {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    return {
        phase,
        providerFamily: config.providerFamily,
        apiType: config.apiType,
        modelId: config.modelId,
        endpoint,
        timeoutMs,
        hasApiKey: Boolean(apiKey?.trim()),
        headerNames: Object.keys(headers).sort(),
        imageCount: request.images.length,
        imageBytes: request.images.reduce((total, image) => total + image.data.byteLength, 0),
        promptChars: request.prompt.length,
    };
}
function getUnsupportedResponseMessage(context) {
    return context.providerFamily === 'anthropic-compatible'
        ? (0, i18n_1.t)('vision.proxy.error.unsupportedAnthropicResponse')
        : (0, i18n_1.t)('vision.proxy.error.unsupportedOpenAIResponse');
}
function isAbortError(error) {
    return error instanceof Error && error.name === 'AbortError';
}
//# sourceMappingURL=client.js.map