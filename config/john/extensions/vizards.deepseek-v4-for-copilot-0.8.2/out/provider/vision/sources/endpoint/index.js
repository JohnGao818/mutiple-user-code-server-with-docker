"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEndpointVisionDescriber = createEndpointVisionDescriber;
const client_1 = require("../../protocols/client");
function createEndpointVisionDescriber(config, apiKey) {
    return new EndpointVisionDescriber(config, apiKey);
}
class EndpointVisionDescriber {
    config;
    apiKey;
    source = 'api-endpoint';
    client = new client_1.VisionProxyClient();
    constructor(config, apiKey) {
        this.config = config;
        this.apiKey = apiKey;
    }
    get id() {
        return `${this.config.providerFamily}:${this.config.modelId}`;
    }
    describe(request) {
        return this.client.describe(this.config, this.apiKey, request);
    }
}
//# sourceMappingURL=index.js.map