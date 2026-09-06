"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testVisionProxyConnection = testVisionProxyConnection;
const vscode_1 = __importDefault(require("vscode"));
const i18n_1 = require("../../../../i18n");
const log_1 = require("../../log");
const client_1 = require("../../protocols/client");
const errors_1 = require("../../protocols/errors");
const TEST_PROMPT = 'This is a vision capability test. Read the 4-character code in the attached image and return only the code.';
// Small captcha-style RGBA PNG with a 4-character code. The user reviews the response.
const TEST_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAHgAAAAwCAYAAADab77TAAAA7ElEQVR42u3bwRGDIBBAUYuw/1IshTq4JWMHgivg+g4/t5iEFwiDk+04jp/ytp0PtVYlDDBgARZgARZgARZgwBfb972p6Ou1vl7r+7n7/OjxAQwYMGDA3wUePUDR178L9MbxAQwYMGDAgJ/4ANEAIzY9gAEDBgwYcARw9EHE6C9YRlDAgAEDBvwN4NmbotkHISuCAk4CXEoBvDrwidSbGfwgcC+KJXowcCtI6+yZvYl7HfCdJa1nBq1+92x54NFLGuCHZ9Tqv8GAk2+yojdpow+CAAMGDBhwXmD5d6EAC7AAC7AAAxZgvQJYefsD61pUdJBmqecAAAAASUVORK5CYII=';
const TEST_IMAGE_DATA_URL = `data:image/png;base64,${TEST_PNG_BASE64}`;
async function testVisionProxyConnection(config, apiKey) {
    const tokenSource = new vscode_1.default.CancellationTokenSource();
    try {
        const description = await new client_1.VisionProxyClient().describe(config, apiKey, {
            prompt: TEST_PROMPT,
            images: [
                {
                    mimeType: 'image/png',
                    data: Buffer.from(TEST_PNG_BASE64, 'base64'),
                },
            ],
            token: tokenSource.token,
        });
        (0, log_1.logVisionProxyTestSucceeded)(config, apiKey, description);
        return { ok: true, imageDataUrl: TEST_IMAGE_DATA_URL, response: description };
    }
    catch (error) {
        (0, log_1.logVisionProxyTestFailed)(error);
        if ((0, errors_1.isVisionProxyError)(error)) {
            return {
                ok: false,
                errorCode: (0, errors_1.getVisionProxyErrorDisplayCode)(error),
                message: error.message,
            };
        }
        return {
            ok: false,
            errorCode: (0, errors_1.getVisionProxyErrorDisplayCode)(error),
            message: error instanceof Error ? error.message : (0, i18n_1.t)('vision.proxy.error.testFailed'),
        };
    }
    finally {
        tokenSource.dispose();
    }
}
//# sourceMappingURL=test.js.map