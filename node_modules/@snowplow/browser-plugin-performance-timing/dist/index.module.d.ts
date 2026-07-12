import { BrowserPlugin } from '@snowplow/browser-tracker-core';
declare global {
    interface Window {
        mozPerformance: any;
        msPerformance: any;
        webkitPerformance: any;
    }
}
/**
 * Adds Performance Timing context to events
 *
 * @remarks
 * May not be fully populated when inital Page View fires
 * Often a good idea to take the latest performance timing context
 * for a given page view id when analysing in the warehouse
 */
declare function PerformanceTimingPlugin(): BrowserPlugin;
export { PerformanceTimingPlugin };
