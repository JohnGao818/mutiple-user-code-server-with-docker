"use strict";
/**
 * DeepSeek V4 peak/off-peak billing windows.
 *
 * The official pricing page defines peak hours as 01:00-04:00 and
 * 06:00-10:00 UTC, Monday through Friday. The page currently expresses both
 * the hours and weekdays in UTC, so this calculation does not depend on the
 * user's local timezone or daylight-saving rules.
 *
 * These windows also happen to be safe if the weekday rule is interpreted in
 * Beijing time: the UTC and Beijing calendar dates diverge at 16:00 UTC. If
 * a future schedule includes 16:00 UTC or later while weekdays remain based
 * on Beijing time, replace getUTCDay() with an Asia/Shanghai date conversion.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingRefreshScheduler = void 0;
exports.getPricingPeriod = getPricingPeriod;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MIN_TIMER_DELAY_MS = 1000;
const PEAK_WINDOWS_UTC = [
    { start: 1, end: 4 },
    { start: 6, end: 10 },
];
const TRANSITION_HOURS_UTC = PEAK_WINDOWS_UTC.flatMap(({ start, end }) => [start, end]);
function getPricingPeriod(now = new Date()) {
    const hour = now.getUTCHours();
    const period = isWeekdayUtc(now.getUTCDay()) && isPeakHour(hour) ? 'peak' : 'offPeak';
    return {
        period,
        nextTransitionAt: getNextTransitionAt(now),
    };
}
function isWeekdayUtc(day) {
    return day >= 1 && day <= 5;
}
function isPeakHour(hour) {
    return PEAK_WINDOWS_UTC.some(({ start, end }) => hour >= start && hour < end);
}
function getNextTransitionAt(now) {
    const utcDayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const nowMs = now.getTime();
    // Scan a full week so Friday after the second peak window and every
    // weekend correctly resolve to Monday 01:00 UTC.
    for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
        const dayStartMs = utcDayStart + dayOffset * DAY_MS;
        if (!isWeekdayUtc(new Date(dayStartMs).getUTCDay())) {
            continue;
        }
        const nextTransitionMs = TRANSITION_HOURS_UTC.map((transitionHour) => dayStartMs + transitionHour * HOUR_MS).find((transitionMs) => transitionMs > nowMs);
        if (nextTransitionMs !== undefined) {
            return new Date(nextTransitionMs);
        }
    }
    throw new Error('Unable to find the next DeepSeek pricing transition');
}
class PricingRefreshScheduler {
    onTransition;
    timer;
    isDisposed = false;
    constructor(onTransition) {
        this.onTransition = onTransition;
        this.schedule();
    }
    dispose() {
        this.isDisposed = true;
        this.clearTimer();
    }
    schedule() {
        if (this.isDisposed) {
            return;
        }
        const now = new Date();
        const { nextTransitionAt } = getPricingPeriod(now);
        const delay = Math.max(nextTransitionAt.getTime() - now.getTime(), MIN_TIMER_DELAY_MS);
        this.timer = setTimeout(() => {
            this.timer = undefined;
            if (this.isDisposed) {
                return;
            }
            this.onTransition();
            this.schedule();
        }, delay);
    }
    clearTimer() {
        if (this.timer !== undefined) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }
}
exports.PricingRefreshScheduler = PricingRefreshScheduler;
//# sourceMappingURL=schedule.js.map