"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVisionProviderAdapter = getVisionProviderAdapter;
const messages_1 = require("./anthropic/messages");
const chat_1 = require("./openai/chat");
const responses_1 = require("./openai/responses");
function getVisionProviderAdapter(config) {
    if (config.providerFamily === 'anthropic-compatible') {
        return messages_1.anthropicMessagesAdapter;
    }
    return config.apiType === 'responses' ? responses_1.openAIResponsesAdapter : chat_1.openAIChatAdapter;
}
//# sourceMappingURL=index.js.map