import { app, BrowserWindow } from "electron";

app.whenReady()
    .then(() => {
        const window = new BrowserWindow({
            autoHideMenuBar: true,
            width: 1000
        });

        window.loadFile("../public/index.html");
    });