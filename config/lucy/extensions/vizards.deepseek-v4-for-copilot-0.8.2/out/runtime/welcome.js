"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showWelcomeIfNeeded = showWelcomeIfNeeded;
const vscode_1 = __importDefault(require("vscode"));
const consts_1 = require("../consts");
async function showWelcomeIfNeeded(context, provider) {
    if (context.globalState.get(consts_1.WELCOME_SHOWN_KEY)) {
        return;
    }
    if (await provider.hasApiKey()) {
        await context.globalState.update(consts_1.WELCOME_SHOWN_KEY, true);
        return;
    }
    await vscode_1.default.commands.executeCommand('workbench.action.openWalkthrough', consts_1.WALKTHROUGH_ID, false);
    await context.globalState.update(consts_1.WELCOME_SHOWN_KEY, true);
}
//# sourceMappingURL=welcome.js.map