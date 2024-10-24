import { app, BrowserWindow } from "electron";

app.whenReady()
    .then(() => {
        const window = new BrowserWindow({
            autoHideMenuBar: true
        });

        window.loadFile("../public/index.html");
    });