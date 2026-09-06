"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processToolFlow = processToolFlow;
const vscode_1 = __importDefault(require("vscode"));
const i18n_1 = require("../../i18n");
const debug_1 = require("../debug");
const consts_1 = require("./consts");
const notices_1 = require("./notices");
const preflight_1 = require("./preflight");
function processToolFlow({ stabilizeToolList, messages, tools, progress, requestKind, }) {
    const filteredMessages = (0, notices_1.filterProviderNotices)((0, preflight_1.filterPreflightControlFlow)(messages));
    const messagesFiltered = filteredMessages !== messages;
    if (!stabilizeToolList) {
        (0, debug_1.logToolFlowDiagnostics)({
            requestKind,
            tools,
            messagesFiltered,
            preflight: 'skipped',
        });
        return {
            preflightHandled: false,
            messages: filteredMessages,
        };
    }
    const activatePreflight = (0, preflight_1.inspectActivatePreflight)(messages, tools);
    if (activatePreflight.remainingActivatorNames.length > 0) {
        if (activatePreflight.rounds >= consts_1.MAX_PREFLIGHT_ROUNDS_PER_USER_REQUEST) {
            (0, debug_1.logToolFlowDiagnostics)({
                requestKind,
                tools,
                messagesFiltered,
                preflight: 'round-limit',
                activatePreflight,
            });
            throw new Error((0, i18n_1.t)('request.preflightRoundLimitExceeded', consts_1.MAX_PREFLIGHT_ROUNDS_PER_USER_REQUEST));
        }
        const nextRound = activatePreflight.rounds + 1;
        (0, debug_1.logToolFlowDiagnostics)({
            requestKind,
            tools,
            messagesFiltered,
            preflight: 'handled',
            activatePreflight,
            nextRound,
        });
        for (const toolName of activatePreflight.remainingActivatorNames) {
            progress.report(new vscode_1.default.LanguageModelToolCallPart((0, preflight_1.createPreflightToolCallId)(nextRound, toolName), toolName, {}));
        }
        return { preflightHandled: true, messages };
    }
    const hasUnexpandedActivateTools = activatePreflight.rounds > 0 &&
        tools?.some((tool) => tool.name.startsWith(consts_1.ACTIVATE_TOOL_PREFIX));
    (0, debug_1.logToolFlowDiagnostics)({
        requestKind,
        tools,
        messagesFiltered,
        preflight: 'ready',
        activatePreflight,
        initialResponseNotice: hasUnexpandedActivateTools,
    });
    return {
        preflightHandled: false,
        messages: filteredMessages,
        initialResponseNotice: hasUnexpandedActivateTools ? (0, notices_1.createToolDriftNotice)() : undefined,
    };
}
//# sourceMappingURL=flow.js.map