"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVisionProxyPanelHtml = getVisionProxyPanelHtml;
const crypto_1 = require("crypto");
const vscode_1 = __importDefault(require("vscode"));
const i18n_1 = require("../../../i18n");
const script_1 = require("./script");
const style_1 = require("./style");
function getVisionProxyPanelHtml(webview, state) {
    const nonce = createNonce();
    const htmlLang = vscode_1.default.env.language.toLowerCase() === 'zh-cn' ? 'zh-CN' : 'en';
    const strings = getVisionProxyPanelStrings();
    const initialState = escapeScriptJson(state);
    const initialStrings = escapeScriptJson(strings);
    const csp = [
        "default-src 'none'",
        `style-src 'nonce-${nonce}'`,
        `script-src 'nonce-${nonce}'`,
        `img-src ${webview.cspSource} data:`,
    ].join('; ');
    return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="${csp}">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(strings.title)}</title>
	<style nonce="${nonce}">${(0, style_1.getVisionProxyPanelStyle)()}</style>
</head>
<body>
	<main>
		<h1>${escapeHtml(strings.title)}</h1>
		<p class="intro">${escapeHtml(strings.description)}</p>
		<div id="summary" class="summary">
			<div class="summary-dot"></div>
			<div>
				<div id="summaryTitle" class="summary-title"></div>
				<div id="summaryDetail" class="summary-detail"></div>
			</div>
		</div>
		<form id="form">
			<fieldset>
				<div id="sourceField" class="field">
					<div id="sourceLabel" class="field-label">${escapeHtml(strings.fieldSource)}</div>
					<div class="source-options" role="radiogroup" aria-labelledby="sourceLabel">
						<label class="source-option">
							<input id="sourceVscodeLm" type="radio" name="source" value="vscode-lm">
							<span>${escapeHtml(strings.sourceVscodeLm)}</span>
						</label>
						<label class="source-option">
							<input id="sourceApiEndpoint" type="radio" name="source" value="api-endpoint">
							<span>${escapeHtml(strings.sourceApiEndpoint)}</span>
						</label>
					</div>
				</div>
				<div id="lmSection" class="section">
					<div class="field">
						<label for="lmModelKey">${escapeHtml(strings.fieldVisionModel)}</label>
						<select id="lmModelKey"></select>
						<div id="lmModelCost" class="hint" hidden></div>
					</div>
				</div>
				<div id="endpointSection" class="section">
					<div class="field">
						<label for="url">${escapeHtml(strings.fieldEndpointUrl)}</label>
						<input id="url" type="url" placeholder="${escapeHtml(strings.placeholderOpenAIEndpoint)}">
					</div>
					<div class="field">
						<label for="endpointType">${escapeHtml(strings.fieldEndpointType)}</label>
						<select id="endpointType">
							<option value="">${escapeHtml(strings.placeholderEndpointType)}</option>
							<option value="openai-chat-completions">${escapeHtml(strings.endpointTypeOpenAIChatCompletions)}</option>
							<option value="openai-responses">${escapeHtml(strings.endpointTypeOpenAIResponses)}</option>
							<option value="anthropic-messages">${escapeHtml(strings.endpointTypeAnthropicMessages)}</option>
						</select>
						<div id="endpointTypeHint" class="hint"></div>
					</div>
					<div class="field">
						<label for="apiKey">${escapeHtml(strings.fieldApiKey)}</label>
						<input id="apiKey" type="password" autocomplete="off">
						<div id="apiKeyHint" class="hint"></div>
					</div>
					<div class="field">
						<label for="modelId">${escapeHtml(strings.fieldModelId)}</label>
						<input id="modelId" placeholder="gpt-4o-mini">
					</div>
					<div class="field">
						<label for="headers">${escapeHtml(strings.fieldCustomHeaders)}</label>
						<textarea id="headers" spellcheck="false" placeholder="{
  &quot;X-Custom-Header&quot;: &quot;value&quot;
}"></textarea>
						<div class="hint">${escapeHtml(strings.hintCustomHeaders)}</div>
					</div>
					<div class="field">
						<label for="extraBody">${escapeHtml(strings.fieldExtraBody)}</label>
						<textarea id="extraBody" spellcheck="false" placeholder="{
  &quot;temperature&quot;: 0,
  &quot;max_tokens&quot;: 1024
}"></textarea>
						<div class="hint">${escapeHtml(strings.hintExtraBody)}</div>
					</div>
					<div class="field">
						<label for="timeoutMs">${escapeHtml(strings.fieldTimeoutMs)}</label>
						<input id="timeoutMs" type="number" min="1" max="2147483647" step="1" placeholder="30000">
						<div class="hint">${escapeHtml(strings.hintTimeoutMs)}</div>
					</div>
				</div>
			</fieldset>
			<div class="actions">
				<button id="save" type="submit">${escapeHtml(strings.actionSave)}</button>
				<button id="test" class="secondary" type="button">${escapeHtml(strings.actionTest)}</button>
			</div>
			<div id="status" class="status" aria-live="polite"></div>
			<div id="testResult" class="test-result" hidden>
				<div class="test-result-grid">
					<div class="test-result-pane">
						<div class="test-result-label">${escapeHtml(strings.testImage)}</div>
						<img id="testImage" class="test-image" alt="${escapeHtml(strings.testImage)}">
					</div>
					<div class="test-result-pane">
						<div class="test-result-label">${escapeHtml(strings.testResponse)}</div>
						<pre id="testResponse" class="test-response"></pre>
					</div>
				</div>
			</div>
		</form>
	</main>
	<script nonce="${nonce}">${(0, script_1.getVisionProxyPanelScript)(initialState, initialStrings)}</script>
</body>
</html>`;
}
function createNonce() {
    return (0, crypto_1.randomBytes)(16).toString('base64');
}
function escapeScriptJson(value) {
    return JSON.stringify(value)
        .replaceAll('<', '\\u003c')
        .replaceAll('\u2028', '\\u2028')
        .replaceAll('\u2029', '\\u2029');
}
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
function getVisionProxyPanelStrings() {
    return {
        title: (0, i18n_1.t)('vision.panel.title'),
        description: (0, i18n_1.t)('vision.panel.description'),
        sourceVscodeLm: (0, i18n_1.t)('vision.panel.source.vscodeLm'),
        sourceApiEndpoint: (0, i18n_1.t)('vision.panel.source.apiEndpoint'),
        fieldSource: (0, i18n_1.t)('vision.panel.field.source'),
        fieldVisionModel: (0, i18n_1.t)('vision.panel.field.visionModel'),
        fieldEndpointType: (0, i18n_1.t)('vision.panel.field.endpointType'),
        fieldEndpointUrl: (0, i18n_1.t)('vision.panel.field.endpointUrl'),
        fieldApiKey: (0, i18n_1.t)('vision.panel.field.apiKey'),
        fieldModelId: (0, i18n_1.t)('vision.panel.field.modelId'),
        fieldCustomHeaders: (0, i18n_1.t)('vision.panel.field.customHeaders'),
        fieldExtraBody: (0, i18n_1.t)('vision.panel.field.extraBody'),
        fieldTimeoutMs: (0, i18n_1.t)('vision.panel.field.timeoutMs'),
        hintCustomHeaders: (0, i18n_1.t)('vision.panel.hint.customHeaders'),
        hintExtraBody: (0, i18n_1.t)('vision.panel.hint.extraBody'),
        hintTimeoutMs: (0, i18n_1.t)('vision.panel.hint.timeoutMs'),
        placeholderOpenAIEndpoint: (0, i18n_1.t)('vision.panel.placeholder.openaiEndpoint'),
        placeholderOpenAIResponsesEndpoint: (0, i18n_1.t)('vision.panel.placeholder.openaiResponsesEndpoint'),
        placeholderAnthropicEndpoint: (0, i18n_1.t)('vision.panel.placeholder.anthropicEndpoint'),
        placeholderEndpointType: (0, i18n_1.t)('vision.panel.placeholder.endpointType'),
        placeholderEnterApiKey: (0, i18n_1.t)('vision.panel.placeholder.enterApiKey'),
        endpointTypeOpenAIChatCompletions: (0, i18n_1.t)('vision.panel.endpointType.openaiChatCompletions'),
        endpointTypeOpenAIResponses: (0, i18n_1.t)('vision.panel.endpointType.openaiResponses'),
        endpointTypeAnthropicMessages: (0, i18n_1.t)('vision.panel.endpointType.anthropicMessages'),
        hintEndpointTypeEmpty: (0, i18n_1.t)('vision.panel.hint.endpointTypeEmpty'),
        hintEndpointTypeInferred: (0, i18n_1.t)('vision.panel.hint.endpointTypeInferred'),
        hintEndpointTypeManual: (0, i18n_1.t)('vision.panel.hint.endpointTypeManual'),
        hintEndpointTypeSelected: (0, i18n_1.t)('vision.panel.hint.endpointTypeSelected'),
        hintApiKeySet: (0, i18n_1.t)('vision.panel.hint.apiKeySet'),
        hintApiKeyUnset: (0, i18n_1.t)('vision.panel.hint.apiKeyUnset'),
        statusVscodeLmSelected: (0, i18n_1.t)('vision.panel.status.vscodeLmSelected'),
        statusApiKeySet: (0, i18n_1.t)('vision.panel.status.apiKeySet'),
        statusApiKeyNotSet: (0, i18n_1.t)('vision.panel.status.apiKeyNotSet'),
        statusTesting: (0, i18n_1.t)('vision.panel.status.testing'),
        statusApiKeyCleared: (0, i18n_1.t)('vision.panel.status.apiKeyCleared'),
        summaryNoVSCodeVisionTitle: (0, i18n_1.t)('vision.panel.summary.noVSCodeVision.title'),
        summaryNoVSCodeVisionDetail: (0, i18n_1.t)('vision.panel.summary.noVSCodeVision.detail'),
        summaryVscodeLmTitle: (0, i18n_1.t)('vision.panel.summary.vscodeLm.title'),
        summaryVscodeLmDetail: (0, i18n_1.t)('vision.panel.summary.vscodeLm.detail'),
        summaryApiNotConfiguredTitle: (0, i18n_1.t)('vision.panel.summary.apiNotConfigured.title'),
        summaryApiNotConfiguredDetail: (0, i18n_1.t)('vision.panel.summary.apiNotConfigured.detail'),
        summaryApiEndpointTitle: (0, i18n_1.t)('vision.panel.summary.apiEndpoint.title'),
        summaryApiEndpointDetail: (0, i18n_1.t)('vision.panel.summary.apiEndpoint.detail'),
        summaryApiKeySet: (0, i18n_1.t)('vision.panel.summary.apiKeySet'),
        summaryApiKeyNotSet: (0, i18n_1.t)('vision.panel.summary.apiKeyNotSet'),
        actionSave: (0, i18n_1.t)('vision.panel.action.save'),
        actionTest: (0, i18n_1.t)('vision.panel.action.test'),
        actionViewDetails: (0, i18n_1.t)('error.action.viewDetails'),
        actionClearApiKey: (0, i18n_1.t)('vision.panel.action.clearApiKey'),
        testImage: (0, i18n_1.t)('vision.panel.test.image'),
        testResponse: (0, i18n_1.t)('vision.panel.test.response'),
        errorRequired: (0, i18n_1.t)('vision.panel.error.required'),
        errorInvalidJson: (0, i18n_1.t)('vision.panel.error.invalidJson'),
    };
}
//# sourceMappingURL=html.js.map