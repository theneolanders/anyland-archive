import z from 'zod'
import { headersToObject, d, isMongoId } from './utils';
import { mkQueueReader, mkWriter } from './nsq'

if (!process.env.ANYLAND_COOKIE) throw "no cookie in env"
if (!process.env.NSQD_HOST) throw "no cookie in env"

//const ANYLAND_ROOT =  "https://app.anyland.com"
const ANYLAND_ROOT =  "https://alhttps.offlineland.io" // This proxies to http://app.anyland.com because the SSL cert is for manyland.com
const DEFAULT_AREAID = "5b6686c83204100709bb4be4";
const NSQD_HOST = process.env.NSQD_HOST;
const NSQD_PORT = 4150;

const { sendNetRequest, enqueueThing, enqueuePlayer, enqueueArea, enqueueForum, enqueueThread, sendCdnError } = await mkWriter(NSQD_HOST, NSQD_PORT);



//////////////////////////////
//////////////////////////////
// These functions abstract the API calls, headers, and send the req/res to NSQ for future reference or in case I mess something up in the archival process.

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


//////////////////////////////
//////////////////////////////


const bumpToken = async () => {
  const response = await api_post("token keepalive", "/p", "");
  if (response.status !== 200) console.log('Token response:', response.status);
  //console.log('Token response:', response.status);
}


//////////////////////////////
//////////////////////////////

// NSQ readers read one item from the queue and process it accordingly
// I use NSQ for the queue and automatic retries (and also because I already run it and it's simple to use).
const startQueueHandlers = () => {

  mkQueueReader("al_things", "archiver", async (id, msg) => {
    try {
      await downloadItemDefAndCrawlForNestedIds(id);
      await downloadItemInfo(id);

      await Bun.sleep(700);

      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })

  mkQueueReader("al_players", "personinfo", async (id, msg) => {
    try {
      console.log("getting player personinfo", id)
      await downloadPersonInfo(id);

      await Bun.sleep(1000);

      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })
  mkQueueReader("al_players", "topby", async (id, msg) => {
    try {
      console.log("getting player topby", id)
      await downloadPersonTopBy(id);

      await Bun.sleep(500);

      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })
  mkQueueReader("al_players", "nifts", async (id, msg) => {
    try {
      console.log("getting player nifts", id)
      await downloadPersonReceivedGifts(id);

      await Bun.sleep(1000);

      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }

  })

}


//////////////////////////////
//////////////////////////////



// Abstracts the generic boilerplate for doing an API call, handling errors, writing to file
// Only use for things that gets written to disk! Not for generic API abstractions.
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
  creatorName: z.string().nullable(), // Might only be null for ground 000000000000000000000001
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
  // why
  z.object({
    isFriend: z.boolean(),
    isEditorHere: z.boolean(),
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
  "downloadPersonTopBy",
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



//////////////////////////////
//////////////////////////////



const AreaListArea = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  playerCount: z.number(),
})

const AreaList = z.object({
  visited: z.array(AreaListArea),
  created: z.array(AreaListArea),
  totalOnline: z.number(),
  totalAreas: z.number(),
  totalPublicAreas: z.number(),
  totalSearchablePublicAreas: z.number(),
  popular: z.array(AreaListArea),
  popular_rnd: z.array(AreaListArea),
  newest: z.array(AreaListArea),
  popularNew: z.array(AreaListArea),
  popularNew_rnd: z.array(AreaListArea),
  lively: z.array(AreaListArea),
  favorite: z.array(AreaListArea),
  mostFavorited: z.array(AreaListArea),
})


const rollAreaRoulette = async () => {
  const res = await api_post("rollAreaRoulette", "/area/lists", `subsetsize=30&setsize=300`).then(res => res.json());
  const body = AreaList.parse(res);

  for (const area of body.popular_rnd) {
    console.log("enqueueing area", area.id, area.name, area.description)
    enqueueArea(area.id)
  }
}




//////////////////////////////
//////////////////////////////



const ForumListSchema = z.object({
  forums: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      creatorId: z.string(),
      creatorName: z.string(),
      threadCount: z.number(),
      latestCommentDate: z.string().datetime(),
      protectionLevel: z.number(),
      creationDate: z.string().datetime(),
      dialogThingId: z.string().optional(),
      dialogColor: z.string().optional(),
      latestCommentText: z.string().optional(),
      latestCommentUserId: z.string().optional(),
      latestCommentUserName: z.string().optional(),
      id: z.string(),
    })
  )
})

const ForumForumSchema = z.object({
  ok: z.boolean(),
  forum: z.object({
    name: z.string(),
    description: z.string(),
    creatorId: z.string(),
    creatorName: z.string(),
    threadCount: z.number(),
    latestCommentDate: z.string().datetime(),
    protectionLevel: z.number(),
    creationDate: z.string().datetime(),
    dialogThingId: z.string().optional(),
    dialogColor: z.string().optional(),
    latestCommentText: z.string().optional(),
    latestCommentUserId: z.string().optional(),
    latestCommentUserName: z.string().optional(),
    user_isModerator: z.boolean(),
    user_hasFavorited: z.boolean()
  }),
  threads: z.array(
    z.object({
      forumId: z.string(),
      title: z.string(),
      creatorId: z.string(),
      creatorName: z.string(),
      latestCommentDate: z.string().datetime(),
      commentCount: z.number(),
      isLocked: z.boolean(),
      isSticky: z.boolean(),
      creationDate: z.string().datetime(),
      latestCommentText: z.string(),
      latestCommentUserId: z.string(),
      latestCommentUserName: z.string(),
      id: z.string()
    })
  )
})



const downloadForum = mkQuery(
  "downloadForum",
  (id) => "data/forum/forum/" + id + ".json",
  (id) => api_get( "downloadForum", "/forum/forum/" + id),
  async (id, res, bodyTxt) => {
      const bodyJson = ForumForumSchema.parse(JSON.parse(bodyTxt))
      enqueueForum(id)
      enqueuePlayer(bodyJson.forum.creatorId)
      if (bodyJson.forum.dialogThingId) enqueueThing(bodyJson.forum.dialogThingId)

      for (const thread of bodyJson.threads) {
        console.log("enqueueing thread", thread.id)
        enqueueThread(thread.id)
      }

      await Bun.sleep(1500);
  },
  true
);

const findAllForums = async () => {
  const alphanumeric = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < alphanumeric.length; i++) {
    const char = alphanumeric[i]
    console.log("Finding forums with", char);
    const body = await api_post("findAllForums", "/forum/search", `searchTerm=${char}`).then(res => res.json()).then(ForumListSchema.parseAsync)

    for (const forum of body.forums) {
      console.log(d(), "downloading", forum.id, forum.name, forum.description, forum.threadCount, forum.latestCommentDate)
      await downloadForum(forum.id)

      // NOTE: We sleep in downloadForum instead of here to avoid sleeping on boards we've skipped
    }

    await Bun.sleep(1500);
  }
}




//////////////////////////////
//////////////////////////////

// Where we actually start it all
// Note that since mostly everything is in one file because I couldn't be bothered to make a factory for the API helpers,
// I comment things in/out and follow a pretty REPL-y style.

bumpToken();
setInterval(bumpToken, 30000);

//startQueueHandlers()
await rollAreaRoulette()
await findAllForums()





//////////////////////////////
//////////////////////////////

// Testing zone

const USER_ID_PHILIPP = "5773b5232da36d2d18b870fb";
const FORUM_ID_UPDATES = "5846f556b09fa5d709e5f6fe";
//api_get("manual test", "/forum/forum/" + FORUM_ID_UPDATES).then(res => res.json()).then(ForumForumSchema.parseAsync).then(console.log).catch(e => console.error)
//api_post("manual test", "/gift/getreceived", `userId=${USER_ID_PHILIPP}`).then(res => res.json()).then(PersonGiftsReceived.parseAsync).then(console.log).catch(e => console.error)
//api_post("manual test", "/thing/topby", `id=${USER_ID_PHILIPP}&limit=0`).then(res => res.json()).then(console.log).catch(e => console.error)
//api_get("manual test", "/sl/tdef/5a9fcb52f744157c9de0b557").then(res => res.json()).then(console.log).catch(console.error)
//api_get("manual test", "/forum/favorites").then(res => res.json()).then(console.log).catch(console.error)
//api_post("manual test", "/area/lists", `subsetsize=-1&setsize=1`).then(res => res.json()).then(console.log).catch(e => console.error)
//api_post("manual test", "/area/lists", `subsetsize=-1&setsize=1`).then(res => res.json()).then(console.log).catch(e => console.error)
//api_post("manual test", "/thing/gettags", `thingId=5a9fcb52f744157c9de0b557`).then(res => res.json()).then(console.log).catch(e => console.error)
//api_post("manual test", "/forum/search", `searchTerm=e`).then(res => res.json()).then(console.log).catch(e => console.error)


/* TODO:
- run getAreaInfo on all areas (list them from files)
- run getSubAreas on all areas
- archive threads
- get creations tags?
- make a query for all known endpoints
- check if thread search returns older threads
- how is philipp's board tied to his profile? he has [board: philbox] in his statusText...
*/


