"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const vscode_1 = __importDefault(require("vscode"));
let channel;
function getChannel() {
    if (!channel) {
        channel = vscode_1.default.window.createOutputChannel('DeepSeek', { log: true });
    }
    return channel;
}
function formatMessage(args) {
    return args
        .map((a) => {
        if (typeof a === 'string')
            return a;
        if (a instanceof Error)
            return a.stack ?? a.message;
        try {
            return JSON.stringify(a);
        }
        catch {
            return String(a);
        }
    })
        .join(' ');
}
exports.logger = {
    info: (...args) => getChannel().info(formatMessage(args)),
    warn: (...args) => getChannel().warn(formatMessage(args)),
    error: (...args) => getChannel().error(formatMessage(args)),
    debug: (...args) => getChannel().debug(formatMessage(args)),
    show: () => getChannel().show(),
    dispose: () => {
        channel?.dispose();
        channel = undefined;
    },
};
//# sourceMappingURL=logger.js.map