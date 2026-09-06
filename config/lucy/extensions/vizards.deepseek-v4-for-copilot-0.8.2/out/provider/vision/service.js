"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVisionService = createVisionService;
const vscode_1 = __importDefault(require("vscode"));
const i18n_1 = require("../../i18n");
const log_1 = require("./log");
const config_1 = require("./sources/endpoint/config");
const endpoint_1 = require("./sources/endpoint");
const panel_1 = require("./ui/panel");
const errors_1 = require("./protocols/errors");
const vscode_2 = require("./sources/vscode");
function createVisionService(context) {
    const store = new config_1.VisionProxyConfigStore(context);
    const vscodeLm = (0, vscode_2.createVSCodeLanguageModelVisionDescriberGetter)();
    const reset = () => {
        vscodeLm.reset();
    };
    context.subscriptions.push(vscode_1.default.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('deepseek-copilot.visionModel')) {
            reset();
        }
    }), context.secrets.onDidChange((event) => {
        if (event.key === config_1.VISION_PROXY_API_KEY_SECRET) {
            reset();
        }
    }));
    return {
        async get() {
            const source = store.getSource();
            if (source === 'vscode-lm') {
                return vscodeLm.get();
            }
            if (source === 'api-endpoint') {
                const result = getApiEndpointConfig(store, true);
                if (!result.config) {
                    if (!result.error) {
                        return undefined;
                    }
                    return createInvalidApiEndpointDescriber(result.error);
                }
                const apiKey = await store.getApiKey();
                const describer = (0, endpoint_1.createEndpointVisionDescriber)(result.config, apiKey);
                (0, log_1.logVisionApiEndpointSelected)(describer.id);
                return describer;
            }
            const result = getApiEndpointConfig(store, false);
            if (result.config) {
                const apiKey = await store.getApiKey();
                const describer = (0, endpoint_1.createEndpointVisionDescriber)(result.config, apiKey);
                (0, log_1.logVisionApiEndpointSelected)(describer.id);
                return describer;
            }
            return vscodeLm.get();
        },
        reset,
        async openConfiguration() {
            (0, panel_1.openVisionProxyPanel)(context, { onDidChange: reset });
        },
    };
}
function getApiEndpointConfig(store, explicitApiEndpointSource) {
    try {
        return { config: store.getConfig() };
    }
    catch (error) {
        (0, log_1.logInvalidVisionProxyApiEndpointConfig)(store.getSource(), explicitApiEndpointSource, error);
        return { error };
    }
}
function createInvalidApiEndpointDescriber(error) {
    return {
        id: 'api-endpoint:invalid-configuration',
        source: 'api-endpoint',
        async describe() {
            if ((0, errors_1.isVisionProxyError)(error)) {
                throw error;
            }
            throw new errors_1.VisionProxyError('missing-configuration', (0, i18n_1.t)('vision.proxy.error.configurationInvalid'), undefined, error);
        },
    };
}
//# sourceMappingURL=service.js.map