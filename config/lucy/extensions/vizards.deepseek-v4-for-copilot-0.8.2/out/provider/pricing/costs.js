"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toModelPricingInfo = toModelPricingInfo;
const vscode_1 = __importDefault(require("vscode"));
const i18n_1 = require("../../i18n");
const schedule_1 = require("./schedule");
const DAY_MS = 24 * 60 * 60 * 1000;
function toModelPricingInfo(model, currency, now = new Date(), showPricingNotice = true) {
    if (!currency || !showPricingNotice) {
        return {};
    }
    const pricingSchedule = model.pricing?.[currency];
    if (!pricingSchedule) {
        return {};
    }
    const period = (0, schedule_1.getPricingPeriod)(now);
    const pricing = pricingSchedule[period.period];
    return {
        ...(model.priceCategory ? { priceCategory: model.priceCategory } : {}),
        infoText: {
            pricing: formatPricingNotice(period.period, pricing, currency, now, period.nextTransitionAt),
        },
    };
}
function formatPricingNotice(period, pricing, currency, now, nextTransitionAt) {
    const periodLabel = (0, i18n_1.t)(period === 'peak' ? 'model.pricing.currentPeak' : 'model.pricing.currentOffPeak');
    const nextPeriod = period === 'peak' ? 'offPeak' : 'peak';
    const nextPeriodLabel = (0, i18n_1.t)(nextPeriod === 'peak' ? 'model.pricing.currentPeak' : 'model.pricing.currentOffPeak');
    const unitSuffix = (0, i18n_1.t)('model.pricing.unitSuffix');
    const transitionTime = formatTransitionTime(now, nextTransitionAt);
    const priceRows = [
        {
            label: (0, i18n_1.t)('model.pricing.inputLabel'),
            value: `${formatPriceValue(pricing.cacheMissInput, currency)}${unitSuffix}`,
        },
        {
            label: (0, i18n_1.t)('model.pricing.cacheHitInputLabel'),
            value: `${formatPriceValue(pricing.cacheHitInput, currency)}${unitSuffix}`,
        },
        {
            label: (0, i18n_1.t)('model.pricing.outputLabel'),
            value: `${formatPriceValue(pricing.output, currency)}${unitSuffix}`,
        },
    ];
    const priceLines = priceRows.map(({ label, value }) => `${label}: ${value}`).join('\n');
    const priceBlock = ['```bash', priceLines, '```'].join('\n');
    const transitionNotice = (0, i18n_1.t)('model.pricing.periodStarts', nextPeriodLabel, transitionTime);
    return [`**${periodLabel}** · ${transitionNotice}`, priceBlock].join('\n');
}
function formatPriceValue(value, currency) {
    return `${currency === 'CNY' ? '¥' : '$'}${value}`;
}
function formatTransitionTime(now, nextTransitionAt) {
    const locale = getPricingLocale();
    const time = new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(nextTransitionAt);
    const dayDifference = getLocalDayNumber(nextTransitionAt) - getLocalDayNumber(now);
    if (dayDifference === 0) {
        return (0, i18n_1.t)('model.pricing.transitionTime.today', time);
    }
    if (dayDifference === 1) {
        return (0, i18n_1.t)('model.pricing.transitionTime.tomorrow', time);
    }
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(nextTransitionAt);
    return (0, i18n_1.t)('model.pricing.transitionTime.weekday', weekday, time);
}
function getLocalDayNumber(date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
}
function getPricingLocale() {
    return vscode_1.default.env.language.toLowerCase() === 'zh-cn' ? 'zh-CN' : 'en-US';
}
//# sourceMappingURL=costs.js.map