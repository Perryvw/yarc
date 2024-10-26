import Directory from "./Directory";
import RequestHeader from "./RequestHeader";
import RequestPanel from "./RequestPanel";
import ResponsePanel from "./ResponsePanel";
import { AppContext, AppContextType } from "./AppContext";
import styled from "styled-components";

const AppRoot = styled.div`
    color-scheme: dark;
    display: flex;
    height: 100%;
    background-color: #1e1f22;
    color: #fff;
    font: 16px/1.5 system-ui;
`;

const MainContainer = styled.div`
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: min-content 1fr;
`;

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
            body: "initial response",
        },
        setRequestHeader() {},
        setRequest() {},
        setResponse() {},
    };

    return (
        <AppContext.Provider value={initialContext}>
            <AppRoot>
                <Directory />

                <MainContainer>
                    <RequestHeader />
                    <RequestPanel />
                    <ResponsePanel />
                </MainContainer>
            </AppRoot>
        </AppContext.Provider>
    );
}
