"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const vscode_1 = __importDefault(require("vscode"));
const consts_1 = require("../consts");
const i18n_1 = require("../i18n");
const logger_1 = require("../logger");
const debug_1 = require("../provider/debug");
function registerCommands(context) {
    context.subscriptions.push(vscode_1.default.commands.registerCommand('deepseek-copilot.showLogs', () => logger_1.logger.show()), vscode_1.default.commands.registerCommand('deepseek-copilot.openRequestDumpsFolder', () => openRequestDumpsFolder(context)), vscode_1.default.commands.registerCommand('deepseek-copilot.getApiKey', () => vscode_1.default.env.openExternal(vscode_1.default.Uri.parse(consts_1.EXTERNAL_URLS.deepseek.apiKeys))), vscode_1.default.commands.registerCommand('deepseek-copilot.openSettings', () => vscode_1.default.commands.executeCommand('workbench.action.openSettings', 'deepseek-copilot')));
}
async function openRequestDumpsFolder(context) {
    try {
        const root = await (0, debug_1.ensureRequestDumpRoot)(context.globalStorageUri);
        logger_1.logger.info(`Opening request dumps folder: ${root.toString(true)}`);
        await vscode_1.default.commands.executeCommand('revealFileInOS', root);
    }
    catch (error) {
        logger_1.logger.warn('Failed to open request dumps folder', error);
        void vscode_1.default.window.showErrorMessage((0, i18n_1.t)('extension.openRequestDumpsFolderFailed'));
    }
}
//# sourceMappingURL=commands.js.map