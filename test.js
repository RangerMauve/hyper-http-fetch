import test from "node:test";
import makeHyperHTTPFetch from "./src/index.js";
import assert from "node:assert";
import createTestnet from "hyperdht/testnet.js";
import createServer from "./src/server.js";

test("Send a request to a server and get a response", async (t) => {
  const testnet = await createTestnet();

  t.after(() => testnet.destroy());

  const url = await createTestServer(t, (_req) => new Response("Hello World"), {
    dht: {
      bootstrap: testnet.bootstrap,
    },
  });

  const fetch = await makeHyperHTTPFetch({ bootstrap: testnet.bootstrap });

  t.after(fetch.close);

  const res = await fetch(url);
  assert(res.ok, "Response is OK");
  const message = await res.text();

  assert.equal(message, "Hello World", "Body has expected message");
});

/**
 *
 * @param {import('node:test').TestContext} t
 * @param {import("./src/server.js").HyperRequestListener} onRequest
 * @param {import("./src/server.js").HyperServerOptions} [options]
 */
async function createTestServer(t, onRequest, options = {}) {
  const server = await createServer(onRequest, options);
  t.after(() => server.destroy());

  return server.url;
}
