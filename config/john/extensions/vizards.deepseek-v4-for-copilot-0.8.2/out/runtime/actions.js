"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerActionUrls = registerActionUrls;
const vscode_1 = __importDefault(require("vscode"));
const client_1 = require("../client");
const consts_1 = require("../consts");
const logger_1 = require("../logger");
const notices_1 = require("../provider/tools/notices");
const ACTION_URLS = [
    {
        key: 'configureApiKey',
        path: consts_1.CONFIGURE_API_KEY_URI_PATH,
        handle: () => vscode_1.default.commands.executeCommand('deepseek-copilot.setApiKey'),
        resolveFailureMessage: 'Failed to resolve DeepSeek set API key URI',
    },
    {
        key: 'showLogs',
        path: consts_1.SHOW_LOGS_URI_PATH,
        handle: () => logger_1.logger.show(),
        resolveFailureMessage: 'Failed to resolve DeepSeek show logs URI',
        setUrl: notices_1.setProviderNoticeShowLogsUrl,
    },
    {
        path: consts_1.SET_VISION_MODEL_URI_PATH,
        handle: () => vscode_1.default.commands.executeCommand('deepseek-copilot.setVisionModel'),
        resolveFailureMessage: 'Failed to resolve DeepSeek set vision model URI',
        setUrl: notices_1.setVisionProxyConfigurationUrl,
    },
];
function registerActionUrls(context) {
    context.subscriptions.push(vscode_1.default.window.registerUriHandler({
        handleUri(uri) {
            const action = ACTION_URLS.find((item) => item.path === uri.path);
            if (action) {
                void Promise.resolve(action.handle()).catch((error) => {
                    logger_1.logger.warn(`Failed to handle DeepSeek URI action: ${uri.path}`, error);
                });
                return;
            }
            logger_1.logger.warn(`Unhandled DeepSeek URI: ${uri.toString(true)}`);
        },
    }));
    for (const action of ACTION_URLS) {
        resolveActionUrl(context, action);
    }
}
function resolveActionUrl(context, action) {
    const rawUri = vscode_1.default.Uri.from({
        scheme: vscode_1.default.env.uriScheme,
        authority: context.extension.id,
        path: action.path,
    });
    setActionUrl(action, rawUri.toString());
    if (action.externalize === false) {
        return;
    }
    void vscode_1.default.env.asExternalUri(rawUri).then((uri) => setActionUrl(action, uri.toString()), (error) => logger_1.logger.warn(action.resolveFailureMessage, error));
}
function setActionUrl(action, url) {
    if (action.key) {
        (0, client_1.setErrorActionUrl)(action.key, url);
    }
    action.setUrl?.(url);
}
//# sourceMappingURL=actions.js.map