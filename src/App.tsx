import { createContext, useState } from "react";
import Directory from "./Directory";
import RequestHeader from "./RequestHeader";
import RequestPanel from "./RequestPanel";
import ResponsePanel from "./ResponsePanel";

const initialContext = {
    url: "0",
    requestBody: "0",
    responseBody: "0"
};
export type AppContextType = typeof initialContext;
export const AppContext = createContext(initialContext);

export default function App() {

    //const [ctx] = useState<AppContextType>(initialContext);

    function onClick() {
        alert("bye");
    }

    return (
        <AppContext.Provider value={initialContext}>
            <div style={{ backgroundColor: "blue", height: "100%", display: "flex" }}>
                <Directory />

                <div style={{flexGrow: 1, display: "flex", flexDirection: "column"}}>
                    <RequestHeader/>
                    <div style={{flexGrow: 1}}>
                        <RequestPanel />
                        <ResponsePanel />
                    </div>
                </div>
            </div>
        </AppContext.Provider>
    )
}