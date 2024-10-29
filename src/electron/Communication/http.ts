import { net } from "electron";
import type { HttpRequestData, ResponseData } from "../../common/request-types";

export async function makeHttpRequest(request: HttpRequestData): Promise<ResponseData> {
    const url = new URL(request.url);

    return new Promise((resolve) => {
        const start = performance.now(); // This isn't good. If we switch to libcurl then get real timings from there.
        const req = net.request({
            method: request.method,
            protocol: url.protocol as "http:" | "https:",
            hostname: url.hostname,
            port: Number(url.port),
            path: url.pathname,
        });

        req.on("response", (response) => {
            let body = "";
            response.on("data", (chunk) => {
                body += chunk;
            });
            response.on("end", () => {
                resolve({
                    statusCode: response.statusCode,
                    headers: response.headers,
                    time: performance.now() - start,
                    body,
                });
            });
        });

        req.write(request.body);

        req.end();
    });
}
