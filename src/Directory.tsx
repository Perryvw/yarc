import { useContext } from "react";
import { AppContext } from "./App";

export default function Directory() {

    const context = useContext(AppContext);

    const loadRequest = (request: string) => () => {
        alert(request);
    }

    return (
        <div style={{
            backgroundColor: "red",
            width: 250,
            height: "100%",
            padding: 5,
            boxSizing: "border-box"
        }}>
            Requests list
            <br />
            <button onClick={loadRequest("A")}>Request A</button>
            <br />
            <button onClick={loadRequest("B")}>Request B</button>
        </div>
    )
}