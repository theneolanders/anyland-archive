import z from 'zod'
import { isMongoId } from './utils';
import { mkQueueReader, mkWriter } from './nsq'

if (!process.env.ANYLAND_COOKIE) throw "no cookie in env"
if (!process.env.NSQD_HOST) throw "no cookie in env"

//const ANYLAND_ROOT =  "https://app.anyland.com"
const ANYLAND_ROOT =  "https://alhttps.offlineland.io" // This proxies to http://app.anyland.com because the SSL cert is for manyland.com
const DEFAULT_AREAID = "5b6686c83204100709bb4be4";
const NSQD_HOST = process.env.NSQD_HOST;
const NSQD_PORT = 4150;

const { sendNetRequest, enqueueThing, enqueuePlayer, enqueueArea, enqueueForum, sendCdnError } = await mkWriter(NSQD_HOST, NSQD_PORT);


function headersToObject(headers: any) {
  const object = {};
  for (const [key, value] of headers) {
    // @ts-ignore
    object[key] = value;
  }
  return object;
}

const api_get = async (reason: string, path: string) => {
  const now = new Date();
  const url = ANYLAND_ROOT + path;
  const headers = {
    'User-Agent': 'UnityPlayer/2018.1.0f2 (UnityWebRequest/1.0, libcurl/7.51.0-DEV)',
    'Accept': '*/*',
    'Accept-Encoding': 'identity',
    'X-Unity-Version': '2018.1.0f2',
    'Cookie': process.env.ANYLAND_COOKIE!,
  }

  const res = await fetch(url, { headers })

  const bodyTxt = await res.clone().text();
  sendNetRequest({
    ts: now.valueOf(),
    ts_iso: now.toISOString(),
    url,
    reason,
    method: "GET",
    reqHeaders: headers,
    reqbody: null,
    resCode: res.status,
    resHeaders: headersToObject(res.headers),
    resText: bodyTxt,
  })


  return res;
}


const api_post = async (reason: string, path: string, body: string) => {
  const now = new Date();
  const url = ANYLAND_ROOT + path;
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'UnityPlayer/2018.1.0f2 (UnityWebRequest/1.0, libcurl/7.51.0-DEV)',
    'Accept': '*/*',
    'Accept-Encoding': 'identity',
    'X-Unity-Version': '2018.1.0f2',
    'Cookie': process.env.ANYLAND_COOKIE!,
  }

  const res = await fetch(url, {
    method: "POST",
    headers: headers,
    body,
  })

  const bodyTxt = await res.clone().text();
  sendNetRequest({
    ts: now.valueOf(),
    ts_iso: now.toISOString(),
    url,
    reason,
    method: "POST",
    reqHeaders: headers,
    reqbody: body,
    resCode: res.status,
    resHeaders: headersToObject(res.headers),
    resText: bodyTxt,
  })


  return res;
}


const bumpToken = async () => {
  const response = await api_post("token keepalive", "/p", "");
  if (response.status !== 200) console.log('Token response:', response.status);
  //console.log('Token response:', response.status);
}

bumpToken();
setInterval(bumpToken, 30000);










mkQueueReader("al_things", "archiver", async (id, msg) => {
  try {
    await downloadItemDefAndCrawlForNestedIds(id);
    await downloadItemInfo(id);

    await Bun.sleep(700);

    msg.finish();
  } catch(e) {
    console.log("error handling!", e)
  }
})

mkQueueReader("al_players", "personinfo", async (id, msg) => {
  try {
    console.log("getting player personinfo", id)
    await downloadPersonInfo(id);

    await Bun.sleep(1000);

    msg.finish();
  } catch(e) {
    console.log("error handling!", e)
  }
})
mkQueueReader("al_players", "topby", async (id, msg) => {
  try {
    console.log("getting player topby", id)
    await downloadPersonTopBy(id);

    await Bun.sleep(500);

    msg.finish();
  } catch(e) {
    console.log("error handling!", e)
  }
})
mkQueueReader("al_players", "nifts", async (id, msg) => {
  try {
    console.log("getting player nifts", id)
    await downloadPersonReceivedGifts(id);

    await Bun.sleep(1000);

    msg.finish();
  } catch(e) {
    console.log("error handling!", e)
  }

})




//////////////////////////////
//////////////////////////////


const d = () => new Date().toISOString();

const mkQuery = (
  ctx: string,
  getFilePath: (id: string) => string,
  query: (id: string) => Promise<Response>,
  onResOk: (id: string, res: Response, bodyTxt: string) => void | Promise<void>,
  throwOnBadRes: boolean,
) => async (id: string) => {
  const file = Bun.file(getFilePath(id))

  if (await file.exists()) {
    console.info(d(), ctx, "file already exists for", id, "skipping")
    return;
  }

  const res = await query(id)
  const bodyTxt = await res.text();

  if (res.ok) {
    try {
      await onResOk(id, res, bodyTxt)
      await Bun.write(file, bodyTxt)
    } catch(e) {
      console.error(d(), ctx, "res handler error!", id, '""""', bodyTxt, '""""')
      console.error(e);
      throw "check logs";
    }
  }
  else {
    console.warn(d(), ctx, "bad response", res.status, '""""', bodyTxt, '""""')
    if (throwOnBadRes) throw "check logs";
  }
}

//////////////////////////////
//////////////////////////////



const ItemInfoSchema = z.object({
  name: z.string(),
  creatorId: z.string(),
  creatorName: z.string(),
  createdDaysAgo: z.number(),
  collectedCount: z.number(),
  placedCount: z.number(),
  clonedFromId: z.string().optional(),
  allCreatorsThingsClonable: z.boolean(),
  isUnlisted: z.boolean(),
}).strict().nullable()


const downloadItemInfo = mkQuery(
  "downloadItemInfo",
  (id) => "data/thing/info/" + id + ".json",
  (id) => api_get("downloadItemInfo", "/thing/info/" + id),

  (id, res, bodyTxt) => {
      const bodyJson = ItemInfoSchema.parse(JSON.parse(bodyTxt))

      if (bodyJson !== null) {
        console.info("enqueueing creator", bodyJson.creatorId)
        enqueuePlayer(bodyJson.creatorId)
        if (bodyJson.clonedFromId) {
          console.info("enqueueing clonedFromId", bodyJson.clonedFromId)
          enqueueThing(bodyJson.clonedFromId)
        }
      }
  },
  true
);

const downloadItemDefAndCrawlForNestedIds = mkQuery(
  "downloadItemDef",
  (id) => "data/thing/def/" + id + ".json",
  (id) => api_get("downloadItemDef", "/sl/tdef/" + id),
  (id, res, bodyTxt) => {
      if (bodyTxt === "") {
        console.warn(d(), `item ${id}'s def is empty!`)
        return;
      }

      const bodyJson = JSON.parse(bodyTxt)
      findNestedIdsInThing(bodyJson)
  },
  true
);


const findNestedIdsInThing = (def: any) => {
  if (typeof def.p === 'undefined') return;

  for (let j = 0; j < def.p.length; j++) {
    const part = def.p[j];
    walkProps(part);
  }
}
const walkProps = (obj: unknown) => {
  if (obj === null) return;

  if (typeof obj === 'object') {
    for (const key in obj) {
      // @ts-ignore
      const val = obj[key];

      // send any string that looks like a mongoId to the work queue
      if (typeof val === "string" && isMongoId(val)) {
        console.debug("Found id", val, "at prop", key)
        enqueueThing(val)
      }

      // Recurse on objects (this includes arrays)
      if (typeof val === 'object') {
        walkProps(val);
      }
    }
  }
}



//////////////////////////////
//////////////////////////////

const PersonInfoSchema = z.union([
  z.object({
    id: z.string(),
    screenName: z.string(),
    age: z.number(),
    statusText: z.string(),
    isFindable: z.boolean(),
    isBanned: z.boolean(),
    lastActivityOn: z.string().datetime(),
    isFriend: z.boolean(),
    isEditorHere: z.boolean(),
    isListEditorHere: z.boolean(),
    isOwnerHere: z.boolean(),
    isAreaLocked: z.boolean(),
    isOnline: z.boolean()
  }).strict(),
  // either deleted/nonexistent players, or some kind of unfindable setting?
  z.object({
    isFriend: z.boolean(),
    isEditorHere: z.boolean(),
    isListEditorHere: z.boolean(),
    isOwnerHere: z.boolean(),
    isAreaLocked: z.boolean(),
    isOnline: z.boolean()
  }).strict(),
])


const downloadPersonInfo = mkQuery(
  "downloadPersonInfo",
  (id) => "data/person/info/" + id + ".json",
  (id) => api_post("downloadPersonInfo", "/person/info/", `userId=${id}&areaId=${DEFAULT_AREAID}`),
  (id, res, bodyTxt) => {
      const bodyJson = PersonInfoSchema.parse(JSON.parse(bodyTxt))
  },
  true
);


const Gift = z.object({
  id: z.string(),
  thingId: z.string(),
  rotationX: z.number(),
  rotationY: z.number(),
  rotationZ: z.number(),
  positionX: z.number(),
  positionY: z.number(),
  positionZ: z.number(),
  dateSent: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  wasSeenByReceiver: z.boolean(),
  isPrivate: z.boolean(),
}).strict();
type Gift = z.infer<typeof Gift>;
const PersonGiftsReceived = z.union([
  z.object({
    gifts: z.array(Gift)
  }),
  z.object({}).strict()
]);

//api_post("manual test", "/gift/getreceived", `userId=5810de65ac626721405bb671`).then(res => res.json()).then(PersonGiftsReceived.parseAsync).then(console.log).catch(e => console.error)

const downloadPersonReceivedGifts = mkQuery(
  "downloadPersonReceivedGifts",
  (id) => "data/person/gift/" + id + ".json",
  (id) => api_post( "downloadPersonReceivedGifts", "/gift/getreceived", `userId=${id}` ),
  (id, res, bodyTxt) => {
      const bodyJson = PersonGiftsReceived.parse(JSON.parse(bodyTxt))
      if (!("gifts" in bodyJson)) { return }
      for (const gift of (bodyJson as any).gifts as Gift[]) {
        console.log("enqueueing gift", gift.thingId, "by", gift.senderName)
        enqueuePlayer(gift.senderId)
        enqueueThing(gift.thingId)
      }
  },
  true
);

const downloadPersonTopBy = mkQuery(
  "downloadPersonReceivedGifts",
  (id) => "data/person/topby/" + id + ".json",
  (id) => api_post( "downloadPersonTopBy", "/thing/topby", `id=${id}&limit=0`),
  (id, res, bodyTxt) => {
      const schema = z.object({ ids: z.array(z.string()) })
      const bodyJson = schema.parse(JSON.parse(bodyTxt))
      for (const id of bodyJson.ids) {
        console.log("enqueueing topthing", id)
        enqueueThing(id)
      }
  },
  true
);



//api_post("manual test", "/gift/getreceived", `userId=5810de65ac626721405bb671`).then(res => res.json()).then(PersonGiftsReceived.parseAsync).then(console.log).catch(e => console.error)
//api_post("manual test", "/thing/topby", `id=5810de65ac626721405bb671&limit=0`).then(res => res.json()).then(console.log).catch(e => console.error)
//api_get("manual test", "/sl/tdef/5a9fcb52f744157c9de0b557").then(res => res.json()).then(console.log).catch(console.error)


