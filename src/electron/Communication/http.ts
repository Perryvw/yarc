import { net } from "electron";
import { IpcEvent } from "../../common/ipc";
import type { HttpRequestData, HttpResponseData, HttpResponseEvent, RequestId } from "../../common/request-types";

const RequestCancelHandles: Partial<Record<RequestId, () => void>> = {};

export async function makeHttpRequest(request: HttpRequestData, ipc: Electron.WebContents) {
    const start = performance.now(); // This isn't good. If we switch to libcurl then get real timings from there.

    try {
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

        const contentType = request.headers.find((kv) => kv.enabled && kv.key === "Content-Type");

        if (!contentType || contentType.value === "application/x-www-form-urlencoded") {
            const bodyFormParams = new URLSearchParams();

            for (const kv of request.bodyForm) {
                if (kv.enabled) {
                    bodyFormParams.append(kv.key, kv.value);
                }
            }

            body = bodyFormParams.toString();
        }

        const req = net.request({
            method: request.method,
            protocol: url.protocol as "http:" | "https:",
            hostname: url.hostname,
            port: Number(url.port),
            path: path,
            headers: headers,
        });

        RequestCancelHandles[request.id] = () => {
            req.abort();
            delete RequestCancelHandles[request.id];
        };

        req.on("abort", () => {
            // TODO: Better error handling
            const data: HttpResponseData = {
                statusCode: 0,
                headers: {},
                time: performance.now() - start,
                body: "Request aborted",
            };
            const event: HttpResponseEvent = {
                requestId: request.id,
                response: data,
            };

            ipc.send(IpcEvent.HttpResponseData, event);
        });

        req.on("error", (error) => {
            delete RequestCancelHandles[request.id];

            // TODO: Better error handling
            const data: HttpResponseData = {
                statusCode: 0,
                headers: {},
                time: performance.now() - start,
                body: error.message,
            };
            const event: HttpResponseEvent = {
                requestId: request.id,
                response: data,
            };

            ipc.send(IpcEvent.HttpResponseData, event);
        });

        req.on("response", (response) => {
            let body = "";
            response.on("data", (chunk) => {
                body += chunk;
            });
            response.on("end", () => {
                delete RequestCancelHandles[request.id];

                const data: HttpResponseData = {
                    statusCode: response.statusCode,
                    headers: response.headers,
                    time: performance.now() - start,
                    body,
                };
                const event: HttpResponseEvent = {
                    requestId: request.id,
                    response: data,
                };
                ipc.send(IpcEvent.HttpResponseData, event);
            });
        });

        if (body) {
            req.write(body);
        }

        req.end();
    } catch (error) {
        // TODO: Better error handling
        const data: HttpResponseData = {
            statusCode: 0,
            headers: {},
            time: performance.now() - start,
            body: error instanceof Error ? error.message : "Unknown error",
        };
        const event: HttpResponseEvent = {
            requestId: request.id,
            response: data,
        };

        ipc.send(IpcEvent.HttpResponseData, event);
    }
}

export function cancelHttpRequest(id: RequestId) {
    if (RequestCancelHandles[id]) {
        RequestCancelHandles[id]();
    }
}
