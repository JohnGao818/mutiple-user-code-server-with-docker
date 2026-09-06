"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDiagnostics = initializeDiagnostics;
const vscode_1 = __importDefault(require("vscode"));
const config_1 = require("../config");
const consts_1 = require("../consts");
const logger_1 = require("../logger");
async function initializeDiagnostics(context) {
    try {
        await (0, config_1.migrateLegacyDebugSetting)();
    }
    catch (error) {
        logger_1.logger.warn('Failed to migrate legacy debug setting', error);
    }
    logger_1.logger.info(`Activating extension version=${context.extension.packageJSON.version}` +
        ` vscode=${vscode_1.default.version}` +
        ` extensionKind=${context.extension.extensionKind}` +
        ` remoteName=${vscode_1.default.env.remoteName ?? 'none'}` +
        ` uiKind=${vscode_1.default.env.uiKind}` +
        ` platform=${process.platform}` +
        ` arch=${process.arch}` +
        ` debugMode=${(0, config_1.getDebugMode)()}`);
    let currentDebugMode = (0, config_1.getDebugMode)();
    context.subscriptions.push(vscode_1.default.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(`${consts_1.CONFIG_SECTION}.debugMode`)) {
            const previous = currentDebugMode;
            currentDebugMode = (0, config_1.getDebugMode)();
            logger_1.logger.info(`debugMode changed: ${previous} -> ${currentDebugMode}`);
        }
    }));
}
//# sourceMappingURL=diagnostics.js.map