"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openVisionProxyPanel = openVisionProxyPanel;
const vscode_1 = __importDefault(require("vscode"));
const i18n_1 = require("../../../i18n");
const config_1 = require("../sources/endpoint/config");
const errors_1 = require("../protocols/errors");
const log_1 = require("../log");
const test_1 = require("../sources/endpoint/test");
const vscode_2 = require("../sources/vscode");
const html_1 = require("./html");
let currentPanel;
function openVisionProxyPanel(context, options) {
    if (currentPanel) {
        currentPanel.reveal();
        return;
    }
    const store = new config_1.VisionProxyConfigStore(context);
    const panel = vscode_1.default.window.createWebviewPanel('deepseekVisionProxy', (0, i18n_1.t)('vision.panel.title'), vscode_1.default.ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: false,
    });
    currentPanel = panel;
    panel.onDidDispose(() => {
        currentPanel = undefined;
    });
    panel.webview.onDidReceiveMessage((message) => {
        void handleMessage(panel, store, options, message);
    });
    void renderPanel(panel, store);
}
async function handleMessage(panel, store, options, message) {
    if (!isWebviewMessage(message)) {
        return;
    }
    if (message.type === 'showLogs') {
        (0, log_1.showVisionLogs)();
        return;
    }
    if (message.type === 'logVisionProxyTestFailure') {
        const errorMessage = getClientErrorMessage(message.value);
        (0, log_1.logVisionProxyTestFailed)(new Error(errorMessage));
        return;
    }
    try {
        if (message.type === 'clearApiKey') {
            await store.deleteApiKey();
            options.onDidChange();
            await panel.webview.postMessage({
                type: 'apiKeyCleared',
                value: { message: (0, i18n_1.t)('vision.panel.status.apiKeyCleared') },
            });
            return;
        }
        if (message.type === 'saveConfig') {
            const payload = getWebviewPayload(message.value);
            if (payload.source === 'vscode-lm') {
                await (0, vscode_2.saveVSCodeVisionModelKey)(getRequiredString(payload.lmModelKey, (0, i18n_1.t)('vision.panel.source.vscodeLm')));
                await store.saveSource('vscode-lm');
            }
            else {
                const config = (0, config_1.normalizeVisionProxyConfig)({
                    ...payload.config,
                    updatedAt: Date.now(),
                });
                await store.saveConfig(config);
                await store.saveSource('api-endpoint');
                if (payload.apiKey) {
                    await store.setApiKey(payload.apiKey);
                }
            }
            options.onDidChange();
            await postState(panel, store);
            postStatus(panel, createSavedMessage(payload));
            return;
        }
        if (message.type === 'testConnection') {
            const payload = getWebviewPayload(message.value);
            if (payload.source === 'vscode-lm') {
                postStatus(panel, (0, i18n_1.t)('vision.panel.status.vscodeLmNoHttpTest'), 'info', undefined, {
                    kind: 'test',
                    testId: payload.testId,
                });
                return;
            }
            const config = (0, config_1.normalizeVisionProxyConfig)(payload.config);
            const apiKey = payload.apiKey || (await store.getApiKey());
            const result = await (0, test_1.testVisionProxyConnection)(config, apiKey);
            if (result.ok) {
                postStatus(panel, (0, i18n_1.t)('vision.panel.status.testSucceeded'), 'success', undefined, {
                    kind: 'test',
                    testId: payload.testId,
                    testResult: getVisionProxyTestResultView(result),
                });
            }
            else {
                postStatus(panel, getVisionProxyTestFailure(result), 'error', createShowLogsAction(), {
                    kind: 'test',
                    testId: payload.testId,
                });
            }
        }
    }
    catch (error) {
        const isTestError = message.type === 'testConnection';
        if (isTestError) {
            (0, log_1.logVisionProxyTestFailed)(error);
        }
        postStatus(panel, getErrorMessage(error), 'error', isTestError ? createShowLogsAction() : undefined, isTestError ? { kind: 'test', testId: getWebviewTestId(message.value) } : undefined);
    }
}
async function renderPanel(panel, store) {
    panel.webview.html = (0, html_1.getVisionProxyPanelHtml)(panel.webview, await getState(store));
}
async function postState(panel, store) {
    await panel.webview.postMessage({ type: 'state', value: await getState(store) });
}
async function getState(store) {
    const lmModels = await (0, vscode_2.listVSCodeVisionModelOptions)();
    const config = getConfigForPanel(store);
    const selectedLmModelKey = (0, vscode_2.pickPreferredVSCodeVisionModelKey)(lmModels, (0, vscode_2.getConfiguredVisionModelKey)());
    return {
        source: getPanelSource(store, config, lmModels),
        config,
        hasApiKey: await store.hasApiKey(),
        lmModels,
        selectedLmModelKey,
    };
}
function getPanelSource(store, config, lmModels) {
    if (lmModels.length === 0) {
        return 'api-endpoint';
    }
    const source = store.getSource();
    if (source) {
        return source;
    }
    return config ? 'api-endpoint' : 'vscode-lm';
}
function getConfigForPanel(store) {
    try {
        return store.getConfig();
    }
    catch {
        return undefined;
    }
}
function postStatus(panel, message, tone = 'info', action, metadata) {
    void panel.webview.postMessage({
        type: 'status',
        value: {
            message,
            error: tone === 'error',
            success: tone === 'success',
            action,
            ...metadata,
        },
    });
}
function getErrorMessage(error) {
    if ((0, errors_1.isVisionProxyError)(error)) {
        return (0, errors_1.formatVisionProxyDisplayMessage)((0, errors_1.getVisionProxyErrorDisplayCode)(error), error.message);
    }
    return (0, errors_1.formatVisionProxyDisplayMessage)((0, errors_1.getVisionProxyErrorDisplayCode)(error), error instanceof Error ? error.message : String(error));
}
function createSavedMessage(payload) {
    if (payload.source === 'vscode-lm') {
        return (0, i18n_1.t)('vision.panel.status.vscodeLmSaved');
    }
    return payload.apiKey
        ? (0, i18n_1.t)('vision.panel.status.endpointSavedWithKey')
        : (0, i18n_1.t)('vision.panel.status.endpointSaved');
}
function getVisionProxyTestFailure(result) {
    return (0, errors_1.formatVisionProxyDisplayMessage)(result.errorCode ?? 'UNKNOWN', result.message ?? (0, i18n_1.t)('vision.proxy.error.testFailed'));
}
function getVisionProxyTestResultView(result) {
    return result.imageDataUrl && result.response
        ? {
            imageDataUrl: result.imageDataUrl,
            response: result.response,
        }
        : undefined;
}
function createShowLogsAction() {
    return { command: 'showLogs', label: (0, i18n_1.t)('error.action.viewDetails') };
}
function getClientErrorMessage(value) {
    const record = asRecord(value);
    const message = record.message;
    return typeof message === 'string' && message.length > 0
        ? message
        : (0, i18n_1.t)('vision.proxy.error.testFailed');
}
function isWebviewMessage(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'type' in value &&
        typeof value.type === 'string');
}
function asRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : {};
}
function getWebviewPayload(value) {
    const payload = asRecord(value);
    const config = asRecord(payload.config);
    const apiKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
    const source = (0, config_1.normalizeVisionProxySource)(payload.source) ?? 'api-endpoint';
    const lmModelKey = typeof payload.lmModelKey === 'string' ? payload.lmModelKey.trim() : '';
    return {
        source,
        config,
        apiKey: apiKey || undefined,
        lmModelKey: lmModelKey || undefined,
        testId: toPositiveInteger(payload.testId),
    };
}
function getWebviewTestId(value) {
    return toPositiveInteger(asRecord(value).testId);
}
function toPositiveInteger(value) {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}
function getRequiredString(value, label) {
    if (!value) {
        throw new Error((0, i18n_1.t)('vision.panel.error.required', label));
    }
    return value;
}
//# sourceMappingURL=panel.js.map