import { net } from "electron";
import { HttpRequestData, ResponseData } from "../AppContext";

export async function makeHttpRequest(request: HttpRequestData): Promise<ResponseData> {
    const host = /(\w+\:\/\/)?(www\.)?([^\/]+)/.exec(request.url)?.[3];

    return new Promise((resolve) => {

        const req = net.request({
            method: request.method,
            protocol: 'https:',
            hostname: host,
            port: 443,
            path: '/'
        });

        req.on('response', response => {
            console.log(response.statusCode);
            let body = '';
            response.on("data", chunk => {
                body += chunk;
            });
            response.on("end", () => {
                resolve({
                    statusCode: response.statusCode!,
                    body
                })
            });
        });

        req.write(request.body);

        req.end();
    });
}