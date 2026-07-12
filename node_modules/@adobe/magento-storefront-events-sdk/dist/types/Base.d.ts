import { ContextName, CustomContext } from "./types/contexts";
import { EventName, ListenerOptions, EventHandler } from "./types/events";
export declare abstract class Base {
    protected setContext<T>(name: ContextName | string, context: T): void;
    protected getContext<T>(name?: ContextName | string): T;
    protected addEventListener(name: EventName, handler: EventHandler, options?: ListenerOptions): void;
    protected removeEventListener(name: EventName, handler: EventHandler): void;
    protected pushEvent(event: EventName, context?: CustomContext): void;
}
//# sourceMappingURL=Base.d.ts.map