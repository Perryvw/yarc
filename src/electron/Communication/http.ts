import { net } from "electron";
import type { HttpRequestData, ResponseData } from "../../common/request-types";

export async function makeHttpRequest(request: HttpRequestData): Promise<ResponseData> {
    const url = new URL(request.url);
    const params = new URLSearchParams(request.params.filter((p) => p.enabled).map((kv) => [kv.key, kv.value]));

    let path = url.pathname;

    // :UrlHasDirtyQueryString
    if (!url.search) {
        if (params.size > 0) {
            path += `?${params}`;
        }
    } else {
        path += url.search;
    }

    const headers = request.headers
        .filter((p) => p.enabled)
        .reduce(
            (acc, { key, value }) => {
                if (acc[key]) {
                    if (Array.isArray(acc[key])) {
                        acc[key].push(value);
                    } else {
                        acc[key] = [acc[key], value];
                    }
                } else {
                    acc[key] = value;
                }

                return acc;
            },
            {} as Record<string, string | string[]>,
        );

    let body = request.body;

    if (request.type === "http") {
        const contentType = request.headers.find((x) => x.key === "Content-Type");

        if (!contentType || contentType.value === "application/x-www-form-urlencoded") {
            const bodyFormParams = new URLSearchParams();

            for (const kv of request.bodyForm) {
                if (kv.enabled) {
                    bodyFormParams.append(kv.key, kv.value);
                }
            }

            body = bodyFormParams.toString();
        }
    }

    return new Promise((resolve) => {
        const start = performance.now(); // This isn't good. If we switch to libcurl then get real timings from there.
        const req = net.request({
            method: request.method,
            protocol: url.protocol as "http:" | "https:",
            hostname: url.hostname,
            port: Number(url.port),
            path: path,
            headers: headers,
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

        if (body) {
            req.write(body);
        }

        req.end();
    });
}
