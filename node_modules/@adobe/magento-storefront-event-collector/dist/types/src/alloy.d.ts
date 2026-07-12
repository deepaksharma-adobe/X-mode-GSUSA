import { AlloyInstance } from "./aep/types/alloy.types";
import { BeaconSchema } from "./types/aep";
import { AlloySendEventResponse } from "./types/aep/segments";
import { Event } from "@adobe/magento-storefront-events-sdk/dist/types/types/events";
/**
 *  configures alloy and assigns it to the window object
 */
declare const configure: (instance: AlloyInstance) => Promise<AlloyInstance>;
/** use an existing instance of alloy already on the page */
declare const setExistingAlloy: (name: string) => Promise<void>;
/**
 * sends event payload that matches the BeaconSchema that's been defined
 */
declare const sendEvent: (schema: BeaconSchema, event: Event) => Promise<AlloySendEventResponse | undefined>;
/**
 * checks to make sure aep in the eventForwarding context is set to true and
 * that there is at least a datastreamId
 */
declare const hasConfig: () => boolean;
/**
 * checks to see if the mg_dnt cookie is set and will set the consent
 * on the alloy instance
 */
declare const setConsent: () => Promise<void>;
/** preconfigured alloy instance that allows us to send an event */
export { configure, hasConfig, setExistingAlloy, sendEvent, setConsent };
//# sourceMappingURL=alloy.d.ts.map