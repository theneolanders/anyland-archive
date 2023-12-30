import z from 'zod'
import { d, headersToObject } from './lib/utils';
import { mkWriter } from './lib/nsq'
import { mkApiReqs, mkApiReqs_cookie } from './lib/api';

console.log(process.env)

if (!process.env.ANYLAND_COOKIE) throw "no cookie in env"
if (!process.env.NSQD_HOST) throw "no nsqd_host in env"

const NSQD_HOST = process.env.NSQD_HOST;
const NSQD_PORT = 4150;

const { sendNetRequest } = await mkWriter(NSQD_HOST, NSQD_PORT);
const api = await mkApiReqs_cookie(sendNetRequest);



//api.bumpToken();
//setInterval(api.bumpToken, 30000);


const relayResponse = (res: Response) => {
  const headers = headersToObject(res.headers);

  return new Response(res.body, {
    headers,
    status: res.status,
  })
}



const CLOUDFRONT_CDN_HOSTNAME = "d6ccx151yatz6.cloudfront.net"


// TODO: use a proper server lib with a router
const server = Bun.serve({
  async fetch(req) {

    const url = new URL(req.url);
    const body = await req.text();

    console.log(d(), req.method, req.url, JSON.stringify(headersToObject(req.headers)), body);


    // Transparently proxy the request to Anyland (and store the req/res exchange via our api helpers)
    if (url.hostname === "app.anyland.com") {
      if (req.method === "GET") {
        const res = await api.get("PROXY_SERVER", url.pathname + url.search, req.headers.get("Cookie"))

        return relayResponse(res)
      }
      else if (req.method === "POST") {
        const contentType = req.headers.get("content-type");

        if (contentType === 'application/x-www-form-urlencoded') {
          const res = await api.post("PROXY_SERVER", url.pathname + url.search, body, req.headers.get("Cookie"))
          return relayResponse(res)
        }
        // TODO: accept JSON requests for convenience?
        else {
          return new Response("Bad content-type!", { status: 400 })
        }
      }
      else {
        console.warn("Client made a request with an unhandled method!")
        return new Response("Method not implemented", { status: 500 })
      }
    }
    else if (url.hostname === CLOUDFRONT_CDN_HOSTNAME) {
      console.log("relaying from CDN", url.pathname)
      const res = await fetch("https://" + CLOUDFRONT_CDN_HOSTNAME + url.pathname)
      return relayResponse(res)
    }
    else {
      console.warn("Unhandled host", url.hostname)
      return new Response("Unhandled host", { status: 500 })
    }
  },
  hostname: process.env.HOST,
  port: process.env.PORT,
});

console.log(server)


// /auth/start POST { authProvider: "STEAM", ast: "something", os: "windows ...", "vrModelName": "", clientVersion: "" }
// /area/load POST { areaId: "", isPrivate: "False" }
//
// TODO: search `term&byCreatorId="id"`
// 92.38.155.172 voice?
// d6ccx151yatz6.cloudfront.net
// /forum/forums/:id
// /forum/favorites GET
// /forum/search POST { searchTerm: "" }
// /forum/searchthreads
// /person/info POST { userId: "", areaId: "" }
// /gift/getreceived POST {userId: ""}
// /thing/topby POST { id: "", limit: 4 }
// /thing/gettags POST thingId: ""
// /area/lists POST { subsetsize: 30, setsize: 300 }
// /person/registerusagemode POST { inDesktopMode: true }
// /forum/forum/:id GET -> dialogThingId is an item, latetCommentUserId, creatorId, 
// /forum//thread/:id GET
//
