"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVisionDescriptionSession = createVisionDescriptionSession;
const i18n_1 = require("../../i18n");
const json_1 = require("../../json");
const notices_1 = require("../tools/notices");
const consts_1 = require("./consts");
const log_1 = require("./log");
const errors_1 = require("./protocols/errors");
const vscode_1 = require("./sources/vscode");
/** Create one lazy describer session shared by every image route in a provider request. */
function createVisionDescriptionSession(stats, token, getDescriber) {
    let describerPromise;
    let describer;
    let missingVisionProxy = false;
    let failureNotice;
    const resolveDescriber = async () => {
        if (token.isCancellationRequested) {
            return undefined;
        }
        describerPromise ??= getDescriber();
        describer = await describerPromise;
        if (!describer && !token.isCancellationRequested && !missingVisionProxy) {
            missingVisionProxy = true;
            (0, log_1.logVisionProxyUnavailable)();
        }
        return describer;
    };
    return {
        async describe(images, owner) {
            const currentDescriber = await resolveDescriber();
            if (!currentDescriber || token.isCancellationRequested) {
                stats.unavailableImageMessages += 1;
                recordImageOutcome(stats, owner, images.length, 'dropped');
                return consts_1.IMAGE_DESCRIPTION_UNAVAILABLE;
            }
            try {
                const description = await currentDescriber.describe({
                    prompt: (0, vscode_1.getVisionPrompt)(),
                    images,
                    token,
                });
                if (description.length === 0) {
                    stats.failedImageMessages += 1;
                    recordImageOutcome(stats, owner, images.length, 'dropped');
                    failureNotice ??= (0, notices_1.createVisionProxyFailureNotice)((0, errors_1.formatVisionProxyErrorCode)('empty-response'), (0, i18n_1.t)('vision.proxy.error.emptyResponse'));
                    return consts_1.IMAGE_DESCRIPTION_UNAVAILABLE;
                }
                stats.generatedImageMessages += 1;
                recordImageOutcome(stats, owner, images.length, 'forwarded');
                return (0, json_1.toWellFormedString)(consts_1.IMAGE_DESCRIPTION_PREFIX + description + consts_1.IMAGE_DESCRIPTION_SUFFIX);
            }
            catch (error) {
                if (isCancellation(error, token)) {
                    stats.unavailableImageMessages += 1;
                    recordImageOutcome(stats, owner, images.length, 'dropped');
                    return consts_1.IMAGE_DESCRIPTION_UNAVAILABLE;
                }
                (0, log_1.logVisionProxyDescribeFailed)(error);
                stats.failedImageMessages += 1;
                recordImageOutcome(stats, owner, images.length, 'dropped');
                failureNotice ??= (0, notices_1.createVisionProxyFailureNotice)((0, errors_1.getVisionProxyErrorDisplayCode)(error), formatVisionProxyErrorMessage(error));
                return consts_1.IMAGE_DESCRIPTION_UNAVAILABLE;
            }
        },
        getMetadata() {
            return {
                visionModelId: describer?.id,
                visionProxySource: describer?.source,
                initialResponseNotice: missingVisionProxy
                    ? (0, notices_1.createVisionProxyMissingNotice)()
                    : failureNotice,
            };
        },
    };
}
function recordImageOutcome(stats, owner, imageParts, outcome) {
    const field = outcome === 'forwarded' ? 'forwardedImageParts' : 'droppedImageParts';
    stats[owner][field] += imageParts;
}
function isCancellation(error, token) {
    return token.isCancellationRequested || ((0, errors_1.isVisionProxyError)(error) && error.code === 'cancelled');
}
function formatVisionProxyErrorMessage(error) {
    if ((0, errors_1.isVisionProxyError)(error)) {
        return error.message;
    }
    return (0, i18n_1.t)('vision.proxy.error.requestFailed', (0, i18n_1.t)('vision.proxy.error.unknown'));
}
//# sourceMappingURL=description.js.map