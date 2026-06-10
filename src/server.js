// @ts-ignore
import HyperDHT from "hyperdht";
// @ts-ignore
import idEncoding from "hypercore-id-encoding";
import { randomBytes } from "node:crypto";
import http from "node:http";
import { Duplex, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const SKIP_BODY_METHODS = new Set(["GET", "HEAD"]);

/**
 * @typedef {(request: Request) => Response|Promise<Response>} HyperRequestListener
 */

/**
 * @typedef {object} HyperServerOptions
 * @property {HyperDHT|ConstructorParameters<typeof HyperDHT>[0]} [dht]
 * @property {Buffer|Uint8Array} [seed]
 */

/**
 * @typedef {object} HyperServer
 * @property {string} url
 * @property {{publicKey: Buffer, secretKey: Buffer}} keyPair
 * @property {() => Promise<void>} destroy
 */

/**
 * Initialize an HTTP server for serving hyper+http requests
 * @param {HyperRequestListener} onRequest
 * @param {HyperServerOptions} [options]
 * @returns {Promise<HyperServer>}
 */
export default async function createServer(
  onRequest,
  { dht: dhtOptions, seed = randomBytes(32) } = {},
) {
  const keyPair = HyperDHT.keyPair(seed);

  const url = `hyper+http://${idEncoding.encode(keyPair.publicKey)}/`;

  // start local http server
  const httpServer = http.createServer(handleRawRequest);

  /** @type {import("node:http").RequestListener} */
  async function handleRawRequest(req, res) {
    try {
      const full = new URL(req.url ?? "/", url).href;
      const method = req.method ?? "GET";
      const request = new Request(full, {
        // @ts-ignore It's OK, just TS being weird
        headers: req.headers,
        method: req.method,
        // @ts-ignore Exists in newer node versions
        signal: req.signal,
        // @ts-ignore It's OK, just TS being weird
        body: SKIP_BODY_METHODS.has(method) ? null : Readable.toWeb(req),
      });

      const response = await onRequest(request);

      for (const [name, value] of response.headers) {
        res.setHeader(name, value);
      }
      res.writeHead(response.status);

      if (response.body) {
        // @ts-ignore The types match up, trust me
        await pipeline(Readable.fromWeb(response.body), res);
      } else {
        res.end("");
      }
    } catch (e) {
      // Expected to happen on connection close
      if (e.toString().includes("ERR_STREAM_PREMATURE_CLOSE")) return;
      res.writeHead(500, {
        "content-type": "text/plain",
      });
      res.end(e.message);
    }
  }

  // start public DHT server
  const dht =
    dhtOptions instanceof HyperDHT ? dhtOptions : new HyperDHT(dhtOptions);

  await dht.fullyBootstrapped();

  const server = dht.createServer((/** @type {Duplex} */ conn) => {
    httpServer.emit("connection", conn);
  });

  server.listen(keyPair);

  async function destroy() {
    await server.close();
    await dht.destroy();
  }

  return { url, destroy, keyPair };
}
