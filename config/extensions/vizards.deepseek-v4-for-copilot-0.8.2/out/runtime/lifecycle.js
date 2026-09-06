"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode_1 = __importDefault(require("vscode"));
const i18n_1 = require("../i18n");
const logger_1 = require("../logger");
const actions_1 = require("./actions");
const commands_1 = require("./commands");
const diagnostics_1 = require("./diagnostics");
const provider_1 = require("./provider");
const welcome_1 = require("./welcome");
let activeProvider;
async function activate(context) {
    await (0, diagnostics_1.initializeDiagnostics)(context);
    (0, commands_1.registerCommands)(context);
    (0, actions_1.registerActionUrls)(context);
    try {
        const provider = await (0, provider_1.registerProvider)(context);
        activeProvider = provider;
        void (0, welcome_1.showWelcomeIfNeeded)(context, provider).catch((error) => {
            logger_1.logger.warn((0, i18n_1.t)('extension.welcomeFailed'), error);
        });
        logger_1.logger.info(`Extension activated version=${context.extension.packageJSON.version}`);
    }
    catch (error) {
        activeProvider = undefined;
        logger_1.logger.error('Failed to activate DeepSeek extension', error);
        void vscode_1.default.window.showErrorMessage((0, i18n_1.t)('extension.activateFailed'));
        throw error;
    }
}
async function deactivate() {
    try {
        await activeProvider?.prepareForDeactivate();
    }
    catch (error) {
        logger_1.logger.warn((0, i18n_1.t)('extension.deactivateFailed'), error);
    }
    finally {
        activeProvider = undefined;
        logger_1.logger.info('Extension deactivated');
        logger_1.logger.dispose();
    }
}
//# sourceMappingURL=lifecycle.js.map