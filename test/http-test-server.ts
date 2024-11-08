import { type IncomingMessage, createServer } from "node:http";
import { parse as parseUrl } from "node:url";

const PORT = process.env.PORT ?? 50080;

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

        if (url.query.sleep) {
            const sleep = Number.parseInt(url.query.sleep as string);
            await new Promise((resolve) => setTimeout(resolve, sleep));
        }

        res.writeHead(200, {
            "Content-Type": "text/plain",
        });

        res.write(`${req.method ?? "UNKNOWN"} ${req.url} HTTP/${req.httpVersion}\n`);

        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            res.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`);
        }

        res.write("\n");

        if (body) {
            res.write(body);
        }

        res.end();
    } catch (error) {
        console.error("Error processing request:", error);
        res.writeHead(500, {
            "Content-Type": "text/plain",
        });
        res.write(error);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Debug server running at http://localhost:${PORT}`);
});
