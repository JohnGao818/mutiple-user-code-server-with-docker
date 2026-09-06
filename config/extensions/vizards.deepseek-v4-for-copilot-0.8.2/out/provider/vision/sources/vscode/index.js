"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSCodeLanguageModelVisionDescriber = void 0;
exports.createVSCodeLanguageModelVisionDescriberGetter = createVSCodeLanguageModelVisionDescriberGetter;
exports.getVisionPrompt = getVisionPrompt;
exports.getConfiguredVisionModelKey = getConfiguredVisionModelKey;
exports.getDefaultVisionModelId = getDefaultVisionModelId;
exports.saveVSCodeVisionModelKey = saveVSCodeVisionModelKey;
exports.listVSCodeVisionModelOptions = listVSCodeVisionModelOptions;
exports.pickPreferredVSCodeVisionModelKey = pickPreferredVSCodeVisionModelKey;
const vscode_1 = __importDefault(require("vscode"));
const i18n_1 = require("../../../../i18n");
const consts_1 = require("../../consts");
const log_1 = require("../../log");
const model_1 = require("./model");
const EXCLUDED_VISION_MODEL_IDS = new Set([
    'copilot-utility',
    'copilot-utility-small',
    'deepseek-v4-flash',
    'deepseek-v4-pro',
]);
const EXCLUDED_VISION_MODEL_VENDORS = new Set(['claude-code', 'copilotcli']);
const EXCLUDED_VISION_TARGET_CHAT_SESSION_TYPES = new Set(['claude-code', 'copilotcli']);
const VSCODE_VISION_MODEL_KEY_SEPARATOR = '/';
function createVSCodeLanguageModelVisionDescriberGetter() {
    let describer;
    let describerPromise;
    let generation = 0;
    return {
        async get() {
            if (describer) {
                return describer;
            }
            if (describerPromise) {
                return describerPromise;
            }
            const requestGeneration = generation;
            const currentPromise = (async () => {
                const models = await listVSCodeVisionModels();
                const configuredKey = getConfiguredVisionModelKey();
                if (requestGeneration !== generation) {
                    return undefined;
                }
                const model = pickPreferredVSCodeVisionModel(models, configuredKey);
                if (model) {
                    (0, log_1.logVSCodeVisionModelSelected)(model);
                    describer = new VSCodeLanguageModelVisionDescriber(model);
                    return describer;
                }
                (0, log_1.logVSCodeVisionModelNotFound)(configuredKey ?? consts_1.DEFAULT_VISION_MODEL_ID);
                return undefined;
            })();
            describerPromise = currentPromise;
            try {
                const result = await currentPromise;
                if (result === undefined &&
                    requestGeneration === generation &&
                    describerPromise === currentPromise) {
                    describerPromise = undefined;
                }
                return result;
            }
            catch (error) {
                if (requestGeneration === generation && describerPromise === currentPromise) {
                    describerPromise = undefined;
                }
                throw error;
            }
        },
        reset() {
            generation += 1;
            describer = undefined;
            describerPromise = undefined;
        },
    };
}
class VSCodeLanguageModelVisionDescriber {
    model;
    source = 'vscode-lm';
    constructor(model) {
        this.model = model;
    }
    get id() {
        return this.model.id;
    }
    async describe(request) {
        const visionMsg = vscode_1.default.LanguageModelChatMessage.User([
            ...request.images.map((image) => new vscode_1.default.LanguageModelDataPart(image.data, image.mimeType)),
            new vscode_1.default.LanguageModelTextPart(request.prompt),
        ]);
        // Keep the user-facing default reasoning effort for the main chat model, but
        // disable thinking for the internal Vision Exp proxy pass. This is a serial
        // preprocessing step, so the extra latency and cost should not be paid unless
        // the user explicitly asks for it in the primary model configuration.
        const requestOptions = isDeepSeekVisionExpModel(this.model)
            ? { modelOptions: { reasoningEffort: 'none' } }
            : {};
        const response = await this.model.sendRequest([visionMsg], requestOptions, request.token);
        let description = '';
        for await (const chunk of response.stream) {
            if (chunk instanceof vscode_1.default.LanguageModelTextPart) {
                description += chunk.value;
            }
        }
        return description.trim();
    }
}
exports.VSCodeLanguageModelVisionDescriber = VSCodeLanguageModelVisionDescriber;
function getVisionPrompt() {
    const config = vscode_1.default.workspace.getConfiguration('deepseek-copilot');
    return (config.get('visionPrompt', consts_1.IMAGE_DESCRIPTION_PROMPT).trim() || consts_1.IMAGE_DESCRIPTION_PROMPT);
}
function getConfiguredVisionModelKey() {
    const config = vscode_1.default.workspace.getConfiguration('deepseek-copilot');
    const key = config.get('visionModel', '');
    return key.trim() || undefined;
}
function getDefaultVisionModelId() {
    return consts_1.DEFAULT_VISION_MODEL_ID;
}
async function saveVSCodeVisionModelKey(key) {
    const normalizedKey = await normalizeVSCodeVisionModelKeyForSave(key);
    if (!normalizedKey) {
        throw new Error((0, i18n_1.t)('vision.panel.error.required', (0, i18n_1.t)('vision.panel.source.vscodeLm')));
    }
    const config = vscode_1.default.workspace.getConfiguration('deepseek-copilot');
    await config.update('visionModel', normalizedKey, vscode_1.default.ConfigurationTarget.Global);
}
async function listVSCodeVisionModelOptions() {
    const models = await listVSCodeVisionModels();
    return models.map((model) => {
        const costDescription = formatLanguageModelCost(model);
        return {
            key: getVSCodeVisionModelKey(model),
            id: model.id,
            vendor: model.vendor,
            name: model.name,
            family: model.family,
            version: model.version,
            label: `${model.name && model.name !== model.id ? `${model.name} (${model.id})` : model.id} - ${model.vendor}`,
            description: `${model.vendor}${model.family ? ` / ${model.family}` : ''}`,
            ...(costDescription ? { costDescription } : {}),
        };
    });
}
function pickPreferredVSCodeVisionModelKey(options, configuredKey) {
    // Always honor explicit user configuration first.
    if (configuredKey) {
        const configured = pickConfiguredVSCodeVisionModelEntry(options, configuredKey);
        if (configured) {
            return configured.key;
        }
        // A stale configured value is treated as a hard stop rather than a silent
        // override. This preserves the existing missing-model notice flow and avoids
        // quietly replacing the user's current selection with the automatic default.
        return undefined;
    }
    // In auto mode, require an exact Vision Exp match and do not fall back to
    // arbitrary options to keep the default path deterministic.
    const preferred = options.find((model) => model.vendor === 'deepseek' && model.id === consts_1.DEFAULT_VISION_MODEL_ID);
    return preferred?.key;
}
async function listVSCodeVisionModels() {
    const allModels = await vscode_1.default.lm.selectChatModels();
    return allModels.filter(isVSCodeVisionModel);
}
function pickPreferredVSCodeVisionModel(models, configuredKey) {
    // Explicit configuration wins over automatic default selection.
    if (configuredKey) {
        const configured = pickConfiguredVSCodeVisionModelEntry(models, configuredKey);
        if (configured) {
            return configured;
        }
        // A stale explicit setting should not trigger a silent fallback. Keep the
        // current unavailable / reconfigure flow intact so the user can correct the
        // model selection explicitly instead of being overridden behind the scenes.
        return undefined;
    }
    // Auto mode: only use the exact default vision model id.
    return models.find((model) => model.vendor === 'deepseek' && model.id === consts_1.DEFAULT_VISION_MODEL_ID);
}
function isVSCodeVisionModel(model) {
    // Keep a narrow DeepSeek exception: allow Vision Exp as proxy, but continue
    // excluding DeepSeek Flash/Pro to avoid recursive self-selection.
    const isDeepSeekVisionExp = isDeepSeekVisionExpModel(model);
    const isVendorAllowed = model.vendor === 'deepseek'
        ? isDeepSeekVisionExp
        : !EXCLUDED_VISION_MODEL_VENDORS.has(model.vendor);
    return (isVendorAllowed &&
        !EXCLUDED_VISION_MODEL_IDS.has(model.id) &&
        !EXCLUDED_VISION_TARGET_CHAT_SESSION_TYPES.has((0, model_1.getVSCodeVisionTargetChatSessionType)(model) ?? '') &&
        getSupportsImageToText(model));
}
function isDeepSeekVisionExpModel(model) {
    return model.vendor === 'deepseek' && model.id === consts_1.DEFAULT_VISION_MODEL_ID;
}
function getVSCodeVisionModelKey(model) {
    return `${model.vendor}${VSCODE_VISION_MODEL_KEY_SEPARATOR}${model.id}`;
}
async function normalizeVSCodeVisionModelKeyForSave(key) {
    const trimmed = key.trim();
    if (!trimmed) {
        return undefined;
    }
    const model = pickConfiguredVSCodeVisionModelEntry(await listVSCodeVisionModels(), trimmed);
    if (!model) {
        throw new Error((0, i18n_1.t)('vision.notFound', trimmed));
    }
    return getVSCodeVisionModelKey(model);
}
function pickConfiguredVSCodeVisionModelEntry(models, configuredKey) {
    // Keep compatibility with legacy bare-id settings while preferring the
    // provider-qualified key for unambiguous matching.
    const legacyId = configuredKey.trim();
    const parsed = parseVSCodeVisionModelKey(configuredKey);
    if (!parsed) {
        return legacyId ? pickLegacyVSCodeVisionModelById(models, legacyId) : undefined;
    }
    if (parsed.vendor) {
        const exact = models.find((model) => model.vendor === parsed.vendor && model.id === parsed.id);
        // VS Code model ids are opaque and may contain "/", so preserve legacy bare-id
        // settings by retrying the whole value when no provider-qualified key matches.
        return exact ?? pickLegacyVSCodeVisionModelById(models, legacyId);
    }
    return pickLegacyVSCodeVisionModelById(models, parsed.id);
}
function pickLegacyVSCodeVisionModelById(models, id) {
    const matches = models.filter((model) => model.id === id);
    return matches.find((model) => model.vendor === 'copilot') ?? matches[0];
}
function parseVSCodeVisionModelKey(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    const separatorIndex = trimmed.indexOf(VSCODE_VISION_MODEL_KEY_SEPARATOR);
    if (separatorIndex <= 0) {
        return { vendor: undefined, id: trimmed };
    }
    const vendor = trimmed.slice(0, separatorIndex).trim();
    const id = trimmed.slice(separatorIndex + VSCODE_VISION_MODEL_KEY_SEPARATOR.length).trim();
    return vendor && id ? { vendor, id } : undefined;
}
function getSupportsImageToText(model) {
    const capabilities = model.capabilities;
    // VS Code providers declare imageInput, while selected LanguageModelChat
    // instances expose it as supportsImageToText in VS Code 1.116+.
    return capabilities?.supportsImageToText === true || capabilities?.imageInput === true;
}
function formatLanguageModelCost(model) {
    const pricingInfo = model;
    const costParts = formatCostParts(toFiniteNumber(pricingInfo.inputCost), toFiniteNumber(pricingInfo.cacheCost), toFiniteNumber(pricingInfo.outputCost));
    const priceCategory = formatPriceCategory(asString(pricingInfo.priceCategory));
    if (costParts) {
        const parts = [(0, i18n_1.t)('vision.panel.cost.tokenCost', costParts)];
        if (priceCategory) {
            parts.push(priceCategory);
        }
        const longContextCostParts = formatCostParts(toFiniteNumber(pricingInfo.longContextInputCost), toFiniteNumber(pricingInfo.longContextCacheCost), toFiniteNumber(pricingInfo.longContextOutputCost));
        if (longContextCostParts) {
            parts.push((0, i18n_1.t)('vision.panel.cost.longContextTokenCost', longContextCostParts));
        }
        return parts.join(' · ');
    }
    if (priceCategory) {
        return priceCategory;
    }
    const pricing = asString(pricingInfo.pricing);
    return pricing ? (0, i18n_1.t)('vision.panel.cost.pricing', pricing) : undefined;
}
function formatCostParts(inputCost, cacheCost, outputCost) {
    const parts = [];
    if (inputCost !== undefined) {
        parts.push((0, i18n_1.t)('vision.panel.cost.input', inputCost));
    }
    if (cacheCost !== undefined) {
        parts.push((0, i18n_1.t)('vision.panel.cost.cachedInput', cacheCost));
    }
    if (outputCost !== undefined) {
        parts.push((0, i18n_1.t)('vision.panel.cost.output', outputCost));
    }
    return parts.length > 0 ? parts.join(', ') : undefined;
}
function formatPriceCategory(priceCategory) {
    switch (priceCategory) {
        case 'low':
            return (0, i18n_1.t)('vision.panel.cost.category.low');
        case 'medium':
            return (0, i18n_1.t)('vision.panel.cost.category.medium');
        case 'high':
            return (0, i18n_1.t)('vision.panel.cost.category.high');
        case 'very_high':
            return (0, i18n_1.t)('vision.panel.cost.category.veryHigh');
        default:
            return priceCategory ? (0, i18n_1.t)('vision.panel.cost.category.named', priceCategory) : undefined;
    }
}
function toFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
function asString(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
//# sourceMappingURL=index.js.map