"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareChatRequest = prepareChatRequest;
const client_1 = require("../client");
const config_1 = require("../config");
const consts_1 = require("../consts");
const endpoint_1 = require("../endpoint");
const i18n_1 = require("../i18n");
const convert_1 = require("./convert");
const debug_1 = require("./debug");
const models_1 = require("./models");
const routing_1 = require("./routing");
const request_1 = require("./tools/request");
const vision_1 = require("./vision");
async function prepareChatRequest({ authManager, globalStorageUri, modelInfo, segment, messages, options, token, cacheDiagnostics, getVisionDescriber, }) {
    const apiKey = await authManager.getApiKey();
    if (!apiKey) {
        throw new Error((0, i18n_1.t)('auth.notConfigured'));
    }
    const baseUrl = (0, config_1.getBaseUrl)();
    const client = new client_1.DeepSeekClient(baseUrl, apiKey);
    const modelDef = consts_1.MODELS.find((m) => m.id === modelInfo.id);
    const thinkingCapability = modelDef?.capabilities.thinking;
    const isThinkingModel = Boolean(thinkingCapability);
    const nativeImageInput = modelDef?.capabilities.nativeImageInput === true;
    const maxTokens = (0, config_1.getMaxTokens)();
    const visionResolution = await (0, vision_1.prepareVisionMessages)({
        messages,
        nativeImageInput,
        token,
        getDescriber: getVisionDescriber,
    });
    const resolvedMessages = visionResolution.messages;
    const deepseekMessages = (0, convert_1.convertMessages)(resolvedMessages, isThinkingModel, nativeImageInput);
    (0, vision_1.finalizeVisionResolutionStats)(visionResolution.stats, deepseekMessages);
    const tools = (0, request_1.prepareRequestTools)(modelDef?.capabilities.toolCalling, options);
    const totalRequestChars = (0, convert_1.countMessageChars)(deepseekMessages);
    const hasNativeImages = visionResolution.stats.imageHandlingMode === 'native' &&
        visionResolution.stats.input.forwardedImageParts +
            visionResolution.stats.tool.forwardedImageParts >
            0;
    const baseRequest = {
        model: (0, config_1.getApiModelId)(modelInfo.id),
        messages: deepseekMessages,
        stream: true,
        tools,
        tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
        max_tokens: maxTokens,
    };
    const requestKind = (0, routing_1.classifyDeepSeekRequest)({
        request: baseRequest,
        inputMessages: messages,
    });
    const configuredThinkingEffort = thinkingCapability
        ? (0, models_1.getConfiguredThinkingEffort)(options, thinkingCapability)
        : 'none';
    // Only force helper requests into disabled thinking on the official API.
    // Custom endpoints keep their configured effort to preserve pre-#137 request shape.
    const forceNoneThinking = (0, routing_1.shouldForceThinkingNone)(requestKind) && (0, endpoint_1.isOfficialDeepSeekBaseUrl)(baseUrl);
    const thinkingEffort = forceNoneThinking ? 'none' : configuredThinkingEffort;
    const request = {
        ...baseRequest,
        ...(isThinkingModel
            ? {
                thinking: {
                    type: thinkingEffort === 'none' ? 'disabled' : 'enabled',
                },
                ...(thinkingEffort === 'none' ? {} : { reasoning_effort: thinkingEffort }),
            }
            : {}),
    };
    (0, debug_1.dumpDeepSeekRequest)(request, {
        globalStorageUri,
        segment,
        requestKind,
        vscodeModelId: modelInfo.id,
        isThinkingModel,
        thinkingEffort,
        maxTokens,
        inputMessages: messages,
        resolvedMessages,
        requestOptions: options,
        visionModelId: visionResolution.visionModelId,
        visionProxySource: visionResolution.visionProxySource,
        visionStats: visionResolution.stats,
    });
    const diagnosticsRun = cacheDiagnostics.beginRequest({
        request,
        segment,
        requestKind,
        vscodeModelId: modelInfo.id,
        isThinkingModel,
        thinkingEffort,
        maxTokens,
        inputMessages: messages,
        resolvedMessages,
        visionModelId: visionResolution.visionModelId,
        visionProxySource: visionResolution.visionProxySource,
        visionStats: visionResolution.stats,
    });
    return {
        client,
        request,
        isThinkingModel,
        totalRequestChars,
        hasNativeImages,
        trailingToolResultIds: (0, request_1.collectTrailingToolResultIds)(deepseekMessages),
        cacheDiagnostics: diagnosticsRun,
        requestKind,
        segment,
        replayMarkerMetadata: visionResolution.replayMarkerMetadata,
        visionMarkerTextChars: visionResolution.stats.markerVisionTextChars || undefined,
        initialResponseNotice: visionResolution.initialResponseNotice,
    };
}
//# sourceMappingURL=request.js.map