import Directory from "./Directory";
import RequestHeader from "./RequestHeader";
import RequestPanel from "./RequestPanel";
import ResponsePanel from "./ResponsePanel";
import { AppContext, AppContextType } from "./AppContext";

export default function App() {

    const initialContext: AppContextType = {
        request: {
            type: "http",
            url: "initialUrl",
            method: "GET",
            body: "initial request",
        },
        response: {
            statusCode: 0,
            body: "initial response"
        },
        setRequestHeader() {},
        setRequest() {},
        setResponse() {}
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