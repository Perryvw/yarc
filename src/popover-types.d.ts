// This is a (hopefully) temporary file to include types for the popover API in react
// Seems they will be adding this in react 19, maybe a future version of the @types/react?
import { HTMLAttributes } from "react";

declare module "react" {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        popover?: string;
        popovertarget?: string;
    }
}
