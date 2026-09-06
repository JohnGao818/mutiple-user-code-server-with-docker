"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBase64 = toBase64;
exports.isRecord = isRecord;
function toBase64(image) {
    return Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength).toString('base64');
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=utils.js.map