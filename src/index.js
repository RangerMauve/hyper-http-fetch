import {
  Request,
  Response,
  Agent as UndiciAgent,
  fetch as undiciFetch,
} from "undici";
// @ts-ignore
import HyperDHT from "hyperdht";
// @ts-ignore
import idEncoding from "hypercore-id-encoding";

export default async function makeHyperHTTPFetch(options = {}) {
  const dht = options instanceof HyperDHT ? options : new HyperDHT(options);

  await dht.fullyBootstrapped();

  const agent = new UndiciAgent({
    connect: ({ hostname }, cb) => {
      const publicKey = idEncoding.decode(hostname);

      const stream = dht.connect(publicKey, {
        reusableSocket: true,
      });

      cb(null, stream);

      stream.on("error", cb);
      stream.on("open", () => {
        stream.removeListener("error", cb);
        cb(null, stream);
      });
    },
  });

  hyperHttpFetch.close = () => dht.destroy();
  return hyperHttpFetch;

  /**
   * @param {string|Request} resource
   * @param {import("undici").RequestInit} [options]
   * @returns {Promise<Response>}
   */
  async function hyperHttpFetch(resource, options = {}) {
    const isPlainResource = typeof resource === "string";
    const url = isPlainResource ? resource : resource.url;

    let finalOptions = options;

    if (!isPlainResource) {
      finalOptions.method = resource.method;
      finalOptions.headers = resource.headers;
      finalOptions.body = resource.body;
    }

    return undiciFetch(url.replace("hyper+http:", "http:"), {
      ...finalOptions,
      dispatcher: agent,
    });
  }
}
