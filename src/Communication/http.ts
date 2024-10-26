import { net } from "electron";
import { HttpRequestData, ResponseData } from "../AppContext";

export async function makeHttpRequest(
    request: HttpRequestData,
): Promise<ResponseData> {
    const url = new URL(request.url);

    return new Promise((resolve) => {
        const req = net.request({
            method: request.method,
            protocol: url.protocol,
            hostname: url.hostname,
            port: Number(url.port),
            path: url.pathname,
        });

        req.on("response", (response) => {
            console.log(response.statusCode);
            let body = "";
            response.on("data", (chunk) => {
                body += chunk;
            });
            response.on("end", () => {
                resolve({
                    statusCode: response.statusCode!,
                    body,
                });
            });
        });

        req.write(request.body);

        req.end();
    });
}
