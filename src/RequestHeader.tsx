import { ChangeEvent, useContext, useRef, useState } from "react";
import { AppContext } from "./App";

export default function RequestHeader() {

    const context = useContext(AppContext);

    function onChange(event: ChangeEvent<HTMLInputElement>) {
        context.url = event.target.value;
    }

    function onClick() {
        alert("hi" + context.url);
    }

    return (
        <div style={{
            backgroundColor: "green",
            height: 30,
            padding: "10"
        }}>
            <input type="text" value={context.url} placeholder="url..." onChange={onChange} style={{width: 400, height: 30}} />
            <button onClick={onClick} style={{height: 30}} >Send</button>
        </div>
    )
}