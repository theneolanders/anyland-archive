import z from 'zod'
import { d, isMongoId, mkQuery } from './lib/utils';
import { mkQueueReader, mkWriter } from './lib/nsq'
import { mkApiReqs } from './lib/api';
import { AreaList, ForumForumSchema, ForumListSchema, Gift, ItemInfoSchema, PersonGiftsReceived, PersonInfoSchema } from './lib/schemas';

if (!process.env.ANYLAND_COOKIE) throw "no cookie in env"
if (!process.env.NSQD_HOST) throw "no cookie in env"

const DEFAULT_AREAID = "5b6686c83204100709bb4be4";
const NSQD_HOST = process.env.NSQD_HOST;
const NSQD_PORT = 4150;

const { sendNetRequest, enqueueThing, enqueuePlayer, enqueueArea, enqueueForum, enqueueThread } = await mkWriter(NSQD_HOST, NSQD_PORT);
const api = await mkApiReqs(sendNetRequest);


//////////////////////////////
//////////////////////////////



const downloadItemInfo = mkQuery(
  "downloadItemInfo",
  (id) => "data/thing/info/" + id + ".json",
  (id) => api.get("downloadItemInfo", "/thing/info/" + id),

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
  (id) => api.get("downloadItemDef", "/sl/tdef/" + id),
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



const downloadPersonInfo = mkQuery(
  "downloadPersonInfo",
  (id) => "data/person/info/" + id + ".json",
  (id) => api.post("downloadPersonInfo", "/person/info/", `userId=${id}&areaId=${DEFAULT_AREAID}`),
  (id, res, bodyTxt) => {
      const bodyJson = PersonInfoSchema.parse(JSON.parse(bodyTxt))
  },
  true
);


const downloadPersonReceivedGifts = mkQuery(
  "downloadPersonReceivedGifts",
  (id) => "data/person/gift/" + id + ".json",
  (id) => api.post( "downloadPersonReceivedGifts", "/gift/getreceived", `userId=${id}` ),
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
  (id) => api.post( "downloadPersonTopBy", "/thing/topby", `id=${id}&limit=0`),
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



const rollAreaRoulette = async () => {
  const res = await api.post("rollAreaRoulette", "/area/lists", `subsetsize=30&setsize=300`).then(res => res.json());
  const body = AreaList.parse(res);

  for (const area of body.popular_rnd) {
    console.log("enqueueing area", area.id, area.name, area.description)
    enqueueArea(area.id)
  }
}




//////////////////////////////
//////////////////////////////

// Where we actually start it all


api.bumpToken();
setInterval(api.bumpToken, 30000);


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



startQueueHandlers()
await rollAreaRoulette()


/* TODO:
- run getAreaInfo on all areas (list them from files)
- run getSubAreas on all areas
- archive threads
- get creations tags?
- make a query for all known endpoints
- check if thread search returns older threads
- how is philipp's board tied to his profile? he has [board: philbox] in his statusText...
*/
