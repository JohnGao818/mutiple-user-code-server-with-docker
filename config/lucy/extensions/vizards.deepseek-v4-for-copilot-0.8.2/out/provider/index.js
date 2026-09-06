"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekChatProvider = void 0;
const vscode_1 = __importDefault(require("vscode"));
const auth_1 = require("../auth");
const config_1 = require("../config");
const consts_1 = require("../consts");
const endpoint_1 = require("../endpoint");
const i18n_1 = require("../i18n");
const logger_1 = require("../logger");
const debug_1 = require("./debug");
const models_1 = require("./models");
const currency_1 = require("./pricing/currency");
const schedule_1 = require("./pricing/schedule");
const request_1 = require("./request");
const routing_1 = require("./routing");
const segment_1 = require("./segment");
const stream_1 = require("./stream");
const tokens_1 = require("./tokens");
const flow_1 = require("./tools/flow");
const vision_1 = require("./vision");
/**
 * DeepSeek Chat Provider — implements vscode.LanguageModelChatProvider so
 * DeepSeek V4 models appear directly in the Copilot Chat model picker.
 */
class DeepSeekChatProvider {
    authManager;
    globalStorageUri;
    onDidChangeLanguageModelChatInformationEmitter = new vscode_1.default.EventEmitter();
    isActive = true;
    onDidChangeLanguageModelChatInformation = this.onDidChangeLanguageModelChatInformationEmitter.event;
    cacheDiagnostics = (0, debug_1.createCacheDiagnosticsRecorder)();
    /** Vision proxy: internal bridge + VS Code LM fallback. */
    vision;
    balanceCurrencyResolver;
    pricingRefreshScheduler;
    /**
     * Adaptive chars-per-token ratio, calibrated from actual usage data.
     * Updated via exponential moving average each time the API reports real token counts.
     */
    charsPerToken = 4.0;
    constructor(context) {
        this.authManager = new auth_1.AuthManager(context);
        this.globalStorageUri = context.globalStorageUri;
        this.vision = (0, vision_1.createVisionService)(context);
        this.balanceCurrencyResolver = new currency_1.BalanceCurrencyResolver(context, this.authManager, () => this.onDidChangeLanguageModelChatInformationEmitter.fire());
        this.pricingRefreshScheduler = new schedule_1.PricingRefreshScheduler(() => this.onDidChangeLanguageModelChatInformationEmitter.fire());
        context.subscriptions.push(this.onDidChangeLanguageModelChatInformationEmitter, this.pricingRefreshScheduler, 
        // Settings-based fallback API key + base URL changes.
        vscode_1.default.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('deepseek-copilot.apiKey') ||
                e.affectsConfiguration('deepseek-copilot.baseUrl')) {
                this.invalidateCurrencyAndRefreshModels();
            }
        }), 
        // Multi-window: SecretStorage changes don't fire onDidChangeConfiguration.
        // When another window sets/clears the API key, refresh this window's
        // model picker so the warning state stays in sync.
        context.secrets.onDidChange((e) => {
            if (e.key === 'deepseek-copilot.apiKey') {
                this.invalidateCurrencyAndRefreshModels();
            }
        }));
    }
    // ---- Public commands ----
    async configureApiKey() {
        const saved = await this.authManager.promptForApiKey();
        if (saved) {
            this.invalidateCurrencyAndRefreshModels();
        }
    }
    async clearApiKey() {
        await this.authManager.deleteApiKey();
        this.invalidateCurrencyAndRefreshModels();
        vscode_1.default.window.showInformationMessage((0, i18n_1.t)('auth.removed'));
    }
    async hasApiKey() {
        return this.authManager.hasApiKey();
    }
    /** Force Copilot Chat to re-query model information (including configurationSchema). */
    refreshModelPicker() {
        this.onDidChangeLanguageModelChatInformationEmitter.fire();
    }
    invalidateCurrencyAndRefreshModels() {
        void this.balanceCurrencyResolver
            .invalidate()
            .catch((error) => logger_1.logger.warn('Failed to invalidate DeepSeek balance currency', error))
            .finally(() => this.onDidChangeLanguageModelChatInformationEmitter.fire());
    }
    async prepareForDeactivate() {
        this.isActive = false;
        this.onDidChangeLanguageModelChatInformationEmitter.fire();
        // Force the host to re-pull `provideLanguageModelChatInformation` synchronously
        // before the extension unloads. With `isActive = false` we now return [],
        // which makes Copilot Chat drop DeepSeek models from the picker immediately
        // instead of leaving stale entries behind after deactivate. The returned
        // model list itself is unused — we only call this for its side effect.
        try {
            await vscode_1.default.lm.selectChatModels({ vendor: 'deepseek' });
        }
        catch (error) {
            logger_1.logger.warn('Failed to refresh DeepSeek models during deactivate', error);
        }
    }
    async setVisionModel() {
        await this.vision.openConfiguration();
    }
    // ---- LanguageModelChatProvider ----
    async provideLanguageModelChatInformation(_options, _token) {
        if (!this.isActive) {
            return [];
        }
        const hasKey = await this.authManager.hasApiKey();
        const pricingCurrency = this.balanceCurrencyResolver.getDisplayCurrency();
        const showPricingNotice = (0, endpoint_1.isOfficialDeepSeekBaseUrl)((0, endpoint_1.normalizeBaseUrl)((0, config_1.getBaseUrl)()));
        const now = new Date();
        if (hasKey) {
            this.balanceCurrencyResolver.refreshInBackground();
        }
        return consts_1.MODELS.map((model) => (0, models_1.toChatInfo)(model, hasKey, pricingCurrency, now, showPricingNotice));
    }
    async provideLanguageModelChatResponse(modelInfo, messages, options, progress, token) {
        const segment = (0, segment_1.resolveConversationSegment)(messages);
        const requestKind = (0, routing_1.classifyProviderRequest)({
            messages,
            tools: options.tools,
        });
        (0, debug_1.dumpProviderInput)({
            globalStorageUri: this.globalStorageUri,
            segment,
            modelInfo,
            messages,
            requestOptions: options,
            requestKind,
        });
        const toolFlow = (0, flow_1.processToolFlow)({
            stabilizeToolList: (0, config_1.getStabilizeToolListEnabled)(),
            messages,
            tools: options.tools,
            progress,
            requestKind,
        });
        if (toolFlow.preflightHandled) {
            return;
        }
        const prepared = await (0, request_1.prepareChatRequest)({
            authManager: this.authManager,
            globalStorageUri: this.globalStorageUri,
            modelInfo,
            segment,
            messages: toolFlow.messages,
            options,
            token,
            cacheDiagnostics: this.cacheDiagnostics,
            getVisionDescriber: () => this.vision.get(),
        });
        return (0, stream_1.streamChatCompletion)({
            prepared,
            progress,
            token,
            initialResponseNotice: joinInitialResponseNotices(toolFlow.initialResponseNotice, prepared.initialResponseNotice),
            getCharsPerToken: () => this.charsPerToken,
            setCharsPerToken: (charsPerToken) => {
                this.charsPerToken = charsPerToken;
            },
        });
    }
    async provideTokenCount(_modelInfo, text, _token) {
        return (0, tokens_1.estimateTokenCount)(text, this.charsPerToken);
    }
}
exports.DeepSeekChatProvider = DeepSeekChatProvider;
function joinInitialResponseNotices(...notices) {
    const joined = notices.filter((notice) => notice && notice.trim().length > 0).join('\n');
    return joined || undefined;
}
//# sourceMappingURL=index.js.map