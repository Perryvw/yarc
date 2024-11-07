import { type IncomingMessage, createServer } from "node:http";
import { parse as parseUrl } from "node:url";

const PORT = process.env.PORT ?? 50080;

function tryParseJSON(str: string) {
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}

async function collectBody(req: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString();
}

const server = createServer(async (req, res) => {
    try {
        const timestamp = new Date().toISOString();
        const url = parseUrl(req.url ?? "", true);

        console.log(`[${timestamp}] Handling request: ${url.pathname}`);

        const body = await collectBody(req);

        const requestInfo = {
            timestamp: timestamp,
            method: req.method ?? "UNKNOWN",
            url: req.url ?? "",
            httpVersion: req.httpVersion,
            headers: req.headers,
            queryParams: url.query,
            pathname: url.pathname,
            body: tryParseJSON(body),
        };

        res.writeHead(200, {
            "Content-Type": "application/json",
        });
        res.end(JSON.stringify(requestInfo, null, 2));
    } catch (error) {
        console.error("Error processing request:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
});

server.listen(PORT, () => {
    console.log(`Debug server running at http://localhost:${PORT}`);
});
