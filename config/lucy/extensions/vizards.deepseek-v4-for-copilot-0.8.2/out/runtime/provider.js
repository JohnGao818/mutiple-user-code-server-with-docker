"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProvider = registerProvider;
const vscode_1 = __importDefault(require("vscode"));
const logger_1 = require("../logger");
const provider_1 = require("../provider");
async function registerProvider(context) {
    const provider = new provider_1.DeepSeekChatProvider(context);
    context.subscriptions.push(vscode_1.default.commands.registerCommand('deepseek-copilot.setApiKey', () => provider.configureApiKey()), vscode_1.default.commands.registerCommand('deepseek-copilot.clearApiKey', () => provider.clearApiKey()), vscode_1.default.commands.registerCommand('deepseek-copilot.setVisionModel', () => provider.setVisionModel()), vscode_1.default.lm.registerLanguageModelChatProvider('deepseek', provider));
    // Copilot Chat can serve cached model info without configurationSchema.
    // Activate it first so this refresh reaches a live listener and re-queries the provider.
    await activateCopilotChat();
    provider.refreshModelPicker();
    return provider;
}
async function activateCopilotChat() {
    try {
        await vscode_1.default.extensions.getExtension('github.copilot-chat')?.activate();
    }
    catch (error) {
        logger_1.logger.warn('Copilot Chat activation unavailable; model picker refresh may be delayed', error);
    }
}
//# sourceMappingURL=provider.js.map