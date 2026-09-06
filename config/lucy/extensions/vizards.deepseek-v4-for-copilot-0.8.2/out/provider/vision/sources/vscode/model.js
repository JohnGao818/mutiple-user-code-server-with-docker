"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVSCodeVisionTargetChatSessionType = getVSCodeVisionTargetChatSessionType;
function getVSCodeVisionTargetChatSessionType(model) {
    // targetChatSessionType is a proposed/runtime VS Code property, so treat it as
    // best-effort metadata. Vendor exclusions remain the stable fallback.
    const value = model.targetChatSessionType;
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
//# sourceMappingURL=model.js.map