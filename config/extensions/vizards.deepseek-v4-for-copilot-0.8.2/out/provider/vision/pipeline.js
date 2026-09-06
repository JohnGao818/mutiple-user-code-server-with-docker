"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareVisionMessages = prepareVisionMessages;
const normalize_1 = require("./normalize");
const resolve_1 = require("./resolve");
const stats_1 = require("./stats");
/** Resolve the provider input through the selected native/proxy vision route. */
async function prepareVisionMessages({ messages, nativeImageInput, token, getDescriber, }) {
    const summary = (0, normalize_1.collectVisionInputSummary)(messages);
    const stats = (0, stats_1.createVisionResolutionStats)();
    applyVisionInputSummary(stats, summary, nativeImageInput);
    const resolution = nativeImageInput
        ? createNativeVisionResolution(messages, stats)
        : await (0, resolve_1.resolveImageMessages)(messages, summary, stats, token, getDescriber);
    return resolution;
}
function createNativeVisionResolution(messages, stats) {
    return {
        messages,
        stats,
        replayMarkerMetadata: {},
    };
}
function applyVisionInputSummary(stats, summary, nativeImageInput) {
    stats.input.imageParts = summary.inputImageParts;
    stats.input.imageMessages = summary.inputImageMessages;
    stats.input.imageBytes = summary.inputImageBytes;
    stats.input.imageMimes = summary.inputImageMimes;
    stats.tool.imageParts = summary.toolResultImageParts;
    stats.tool.imageBytes = summary.toolResultImageBytes;
    stats.tool.imageMimes = summary.toolResultImageMimes;
    stats.tool.resultsWithImages = summary.toolResultsWithImages;
    if (summary.inputImageParts + summary.toolResultImageParts > 0) {
        stats.imageHandlingMode = nativeImageInput ? 'native' : 'proxy';
    }
}
//# sourceMappingURL=pipeline.js.map