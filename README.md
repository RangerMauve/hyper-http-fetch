# hyper-http-fetch

Use the fetch API to access HTTP servers exposed by hypertele.

## Install

```bash
npm install hyper-http-fetch
```

## Usage

### Client: Making requests

Import `makeHyperHTTPFetch` to get a `fetch`-compatible function for requesting `hyper+http://` URLs:

```js
import makeHyperHTTPFetch from "hyper-http-fetch";

const fetch = await makeHyperHTTPFetch({
  bootstrap: ["list", "of", "dht", "nodes"], // optional DHT options
});

const res = await fetch("hyper+http://${z32 encoded public key}/path");
console.log(res.ok);
console.log(await res.text());

// Clean up when done
fetch.close();
```

You can also pass an existing `HyperDHT` instance instead of options:

```js
import HyperDHT from "hyperdht";
import makeHyperHTTPFetch from "hyper-http-fetch";

const dht = new HyperDHT();
const fetch = await makeHyperHTTPFetch(dht);

const res = await fetch("hyper+http://...");
```

A `Request` object can also be passed as the first argument:

```js
const res = await fetch(
  new Request("hyper+http://.../path", { method: "POST", body: JSON.stringify({ hello: true }) })
);
```

### Server: Exposing an HTTP server over the DHT

Import `./server` to create an HTTP server accessible via `hyper+http://`:

```js
import createServer from "hyper-http-fetch/server";

const server = await createServer((req) => {
  return new Response("Hello World");
});

console.log(server.url); // e.g. "hyper+http://abcdef123.../"
```

The returned server object has:

- **`url`** — the `hyper+http://` URL clients can use to reach this server
- **`keyPair`** — `{ publicKey, privateKey }` used for the DHT identity
- **`destroy()`** — shut down the server and clean up

You can pass optional configuration:

```js
const server = await createServer(
  (req) => new Response(req.url),
  {
    dht: { bootstrap: ["my.dht.peer:2000"] },
    seed: crypto.randomBytes(32), // optional, for deterministic keys
  }
);
```
