import { Hono } from "hono";
import { cors } from "hono/cors";
import parseRange from "range-parser";
import { geojson } from "flatgeobuf";
import { sampleGeojsonData } from './geojson';

const CACHE_KEY = "API";

const app = new Hono<{
  Bindings: {
    CACHE_TEST: KVNamespace;
  };
}>();

app.get("/", (c) => c.text("Hello! Hono!", 200));

// app.use(
//   "/api",
//   cors({ origin: "*", allowMethods: ["GET"], allowHeaders: ["range"] })
// );
app.options("/api", (c) => {
  console.log(
    `c.req.headers.get("Access-Control-Request-Headers"): `,
    c.req.headers.get("Access-Control-Request-Headers")
  );
  console.log(
    `c.req.headers.get("Access-Control-Request-Method"): `,
    c.req.headers.get("Access-Control-Request-Method")
  );

  return new Response(null, {
    status: 200,
    headers: {
      "access-control-allow-headers": "range",
      "access-control-allow-methods": "GET",
      "access-control-allow-origin": "*",
    },
  });
});
app.get("/api", async (c) => {
  // const res = await fetch(
  //   "https://raw.githubusercontent.com/flatgeobuf/flatgeobuf/master/test/data/countries.geojson"
  // );
  // const body = await res.json();
  // console.log(body);
  // const flatgeobuf = geojson.serialize(body);
  const flatgeobuf = geojson.serialize(sampleGeojsonData);
  const size = flatgeobuf.byteLength;

  const rangeHeader = c.req.headers.get("range");
  if (rangeHeader) {
    const ranges = parseRange(flatgeobuf.length, rangeHeader);
    console.log("ranges", ranges);

    if (typeof ranges === "number") {
      // c.newResponse(flatgeobuf, 200);
      console.error("error ranges:", ranges);
      return c.text("error");
    } else {
      const range = ranges[0];
      console.log("range", range);

      // console.log(flatgeobuf.length, JSON.stringify(range));
      // Handle unavailable range request
      if (range.start >= size || range.end >= size) {
        // Return the 416 Range Not Satisfiable.
        c.status(416);
        c.header("Content-Range", `bytes */${size}`);
        console.log("failed");
        c.body("failed");
      } else {
        const partial = flatgeobuf.slice(range.start, range.end);
        console.log("partial.byteLength", partial.byteLength);

        /** Sending Partial Content With HTTP Code 206 */
        return new Response(partial, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": (range.end - range.start + 1).toString(),
            "Content-Type": "application/octet-stream",
            "access-control-allow-origin": "*",
          },
        });
      }
    }
  } else {
    return new Response(flatgeobuf, {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": size.toString(),
        "Content-Type": "application/octet-stream",
        "access-control-allow-origin": "*",
      },
    });
  }
});

// app.get("/api", async (c) => {
//   const flatgeobuf = geojson.serialize(data);
//   // console.log(flatgeobuf);

//   const cache = await c.env.CACHE_TEST.get(CACHE_KEY, "arrayBuffer");
//   if (cache) {
//     console.log("============== Cache HIT !! ==============");
//     return c.newResponse(cache, 200);
//   }
//   c.executionCtx.waitUntil(
//     c.env.CACHE_TEST.put(CACHE_KEY, flatgeobuf, { expirationTtl: 60 })
//   );
//   return c.newResponse(flatgeobuf, 200);
// });

// const header = {
//   "accept-ranges": "bytes",
//   "content-type": "application/octet-stream",
// };

// app.get("/api", async (c) => {
//   // const cache = await c.env.CACHE_TEST.get(CACHE_KEY, "arrayBuffer");
//   // if (cache) {
//   //   console.log("============== Cache HIT !! ==============");

//   //   return c.newResponse(cache, 200, {
//   //     ...header,
//   //     // "content-length": cache.byteLength.toString(),
//   //   });
//   // }

//   try {
//     const res = await fetch(
//       "https://raw.githubusercontent.com/flatgeobuf/flatgeobuf/master/test/data/countries.geojson"
//     );
//     const body = await res.json();
//     console.log(body);
//     const flatgeobuf = geojson.serialize(body);

//     // c.executionCtx.waitUntil(
//     //   c.env.CACHE_TEST.put(CACHE_KEY, flatgeobuf, { expirationTtl: 60 })
//     // );
//     return c.newResponse(flatgeobuf, 200);
//   } catch (error) {
//     console.error(error);
//     return c.text("error");
//   }
// });

export default app;
