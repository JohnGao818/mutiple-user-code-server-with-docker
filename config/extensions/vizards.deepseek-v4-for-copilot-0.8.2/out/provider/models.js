"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toChatInfo = toChatInfo;
exports.getConfiguredThinkingEffort = getConfiguredThinkingEffort;
const vscode_1 = __importDefault(require("vscode"));
const i18n_1 = require("../i18n");
const costs_1 = require("./pricing/costs");
function toChatInfo(m, hasApiKey, pricingCurrency, now = new Date(), showPricingNotice = true) {
    const modelDetail = resolveModelText(m, 'detail') ?? m.detail;
    const modelTooltip = resolveModelText(m, 'tooltip');
    const thinkingCapability = m.capabilities.thinking;
    return {
        id: m.id,
        name: m.name,
        family: m.family,
        version: m.version,
        detail: hasApiKey ? modelDetail : (0, i18n_1.t)('auth.apiKeyRequiredDetail'),
        tooltip: hasApiKey ? modelTooltip : (0, i18n_1.t)('auth.apiKeyRequiredDetail'),
        statusIcon: hasApiKey ? undefined : new vscode_1.default.ThemeIcon('warning'),
        maxInputTokens: m.maxInputTokens,
        maxOutputTokens: m.maxOutputTokens,
        isBYOK: true,
        isUserSelectable: true,
        capabilities: {
            toolCalling: m.capabilities.toolCalling,
            imageInput: m.capabilities.imageInput,
        },
        ...(0, costs_1.toModelPricingInfo)(m, pricingCurrency, now, showPricingNotice),
        ...(thinkingCapability
            ? { configurationSchema: buildThinkingEffortSchema(thinkingCapability) }
            : {}),
    };
}
function getConfiguredThinkingEffort(options, thinkingCapability) {
    // Prefer request-scoped overrides first so an internal proxy pass can force a
    // specific effort without mutating the persisted user model configuration.
    const configuredEffort = options.modelOptions?.reasoningEffort ??
        options.modelConfiguration?.reasoningEffort ??
        options.configuration?.reasoningEffort;
    if (configuredEffort === 'none' && thinkingCapability.canDisable) {
        return 'none';
    }
    if (isSupportedReasoningEffort(configuredEffort, thinkingCapability)) {
        return configuredEffort;
    }
    return thinkingCapability.defaultEffort;
}
function buildThinkingEffortSchema(thinkingCapability) {
    const efforts = [
        ...(thinkingCapability.canDisable ? ['none'] : []),
        ...thinkingCapability.supportedEfforts,
    ];
    return {
        properties: {
            reasoningEffort: {
                type: 'string',
                title: (0, i18n_1.t)('status.thinking'),
                enum: efforts,
                enumItemLabels: efforts.map((effort) => (0, i18n_1.t)(`thinking.${effort}`)),
                enumDescriptions: efforts.map((effort) => (0, i18n_1.t)(`thinking.${effort}.desc`)),
                default: thinkingCapability.defaultEffort,
                group: 'navigation',
            },
        },
    };
}
function isSupportedReasoningEffort(value, thinkingCapability) {
    return thinkingCapability.supportedEfforts.some((effort) => effort === value);
}
function resolveModelText(m, field) {
    const suffix = m.id.startsWith('deepseek-v4-') ? m.id.slice('deepseek-v4-'.length) : m.id;
    const key = `model.${suffix}.${field}`;
    const translated = (0, i18n_1.t)(key);
    return translated !== key ? translated : undefined;
}
//# sourceMappingURL=models.js.map