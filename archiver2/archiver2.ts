import z from 'zod'
import nsq from 'nsqjs'
import { d, isMongoId, mkQuery, mkQuery_ } from './lib/utils';
import { mkQueueReader, mkWriter } from './lib/nsq'
import { mkApiReqs } from './lib/api';
import { AreaInfoSchema, AreaList, AreaSearchSchema, ForumForumSchema, ForumListSchema, Gift, ItemInfoSchema, ItemTagsSchema, PersonGiftsReceived, PersonInfoSchema, PlacementInfoSchema, SubareaListSchema, ThreadsSchema } from './lib/schemas';

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
  true,
  1000,
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
  true,
  700,
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

const downloadItemTags = mkQuery(
  "downloadItemTags",
  (id) => "data/thing/tags/" + id + ".json",
  (id) => api.post("downloadItemTags", "/thing/gettags/", `thingId=${id}`),

  (id, res, bodyTxt) => {
    const bodyJson = ItemTagsSchema.parse(JSON.parse(bodyTxt))

    for (const tag of bodyJson.tags) {
      for (const userId of tag.userIds) {
        enqueuePlayer(userId)
      }
    }
  },
  true,
  5000,
);



//////////////////////////////
//////////////////////////////



const downloadPersonInfo = mkQuery(
  "downloadPersonInfo",
  (id) => "data/person/info/" + id + ".json",
  (id) => api.post("downloadPersonInfo", "/person/info/", `userId=${id}&areaId=${DEFAULT_AREAID}`),
  (id, res, bodyTxt) => {
      const bodyJson = PersonInfoSchema.parse(JSON.parse(bodyTxt))
  },
  true,
  1000
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
  true,
  1000
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
  true,
  1000
);

const searchAreasByPerson = mkQuery(
  "searchAreasByPerson",
  (id) => "data/person/areasearch/" + id + ".json",
  (id) => api.post( "searchAreasByPerson", "/area/search", `term=&byCreatorId=${id}`),
  (id, res, bodyTxt) => {
      const bodyJson = AreaSearchSchema.parse(JSON.parse(bodyTxt))
      for (const area of bodyJson.areas) {
        console.log("enqueueing area", area.id, area.name, area.description)
        enqueueArea(area.id)
      }
  },
  true,
  3000
);

//////////////////////////////
//////////////////////////////


const downloadThread = mkQuery(
  "downloadThread",
  (id) => "data/forum/thread/" + id + ".json",
  (id) => api.get( "downloadThread", "/forum/thread/" + id),
  (id, res, bodyTxt) => {
      const bodyJson = ThreadsSchema.parse(JSON.parse(bodyTxt))
      enqueuePlayer(bodyJson.forum.creatorId)
      if (bodyJson.forum.latestCommentUserId) {
        enqueuePlayer(bodyJson.forum.latestCommentUserId)
      }
      if (bodyJson.forum.dialogThingId) {
        enqueueThing(bodyJson.forum.dialogThingId)
      }

      for (const comment of bodyJson.thread.comments) {
        enqueuePlayer(comment.userId)

        if (comment.likes) {
          comment.likes.forEach(id => enqueuePlayer(id))
        }
        if (comment.oldestLikes) {
          comment.oldestLikes.forEach(({id}) => enqueuePlayer(id))
        }
        if (comment.newestLikes) {
          comment.newestLikes.forEach(({id}) => enqueuePlayer(id))
        }

        if (comment.thingId) {
          enqueueThing(comment.thingId)
        }
      }
  },
  true,
  2000
);

//////////////////////////////
//////////////////////////////

const downloadPlacementInfo = mkQuery_<{areaId: string, placementId: string}>(
  "downloadPlacementInfo",
  ({areaId, placementId}) => "data/placement/info/" + areaId + "/" + placementId + ".json",
  ({areaId, placementId}) => api.post( "archiver2_downloadPlacementInfo", "/placement/info", `areaId=${areaId}&placementId=${placementId}`),
  async ({ areaId, placementId }, res, bodyTxt) => {
    const bodyJson = PlacementInfoSchema.parse(JSON.parse(bodyTxt))
    console.log("placement", areaId, placementId, bodyTxt)
    enqueuePlayer(bodyJson.placerId)
  },
  true,
  3000
);


//////////////////////////////
//////////////////////////////


const downloadAreaInfo = mkQuery(
  "downloadAreaInfo",
  (id) => "data/area/info/" + id + ".json",
  (id) => api.post("archiver2_downloadAreaInfo", "/area/info", `areaId=${id}`),
  (id, res, bodyTxt) => {
    const bodyJson = AreaInfoSchema.parse(JSON.parse(bodyTxt))

    if (bodyJson.parentAreaId) {
      enqueueArea(bodyJson.parentAreaId)
    }

    for (const editor of bodyJson.editors) {
      enqueuePlayer(editor.id)
    }
    for (const editor of bodyJson.listEditors) {
      enqueuePlayer(editor.id)
    }

    for (const area of bodyJson.copiedFromAreas) {
      enqueuePlayer(area.creatorId)
      enqueueArea(area.id)
    }
  },
  true,
  2000
);

const downloadAreaSubareas = mkQuery(
  "downloadAreaSubareas",
  (id) => "data/area/subareas/" + id + ".json",
  (id) => api.post("archiver2_downloadAreaSubareas", "/area/getsubareas", `areaId=${id}`),
  (id, res, bodyTxt) => {
    const bodyJson = SubareaListSchema.parse(JSON.parse(bodyTxt))

    for (const area of bodyJson.subAreas) {
      // NOTE: not distinguishing areas and subareas means we'll get subareas in downloadAreaSubareas,
      // but the API happily returns data so this is not really an issue
      enqueueArea(area.id) 
    }
  },
  true,
  2000
);

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
      await downloadItemTags(id);

      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })

  mkQueueReader("al_things", "tags", async (id, msg) => {
    try {
      await downloadItemTags(id);

      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })




  mkQueueReader("al_players", "personinfo", async (id, msg) => {
    try {
      console.log("getting player personinfo", id)
      await downloadPersonInfo(id);
      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })
  mkQueueReader("al_players", "topby", async (id, msg) => {
    try {
      console.log("getting player topby", id)
      await downloadPersonTopBy(id);

      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })
  mkQueueReader("al_players", "nifts", async (id, msg) => {
    try {
      console.log("getting player nifts", id)
      await downloadPersonReceivedGifts(id);

      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })

  mkQueueReader("al_players", "areasearch", async (id, msg) => {
    try {
      console.log("searching areas by person", id)
      await searchAreasByPerson(id);
      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })




  mkQueueReader("al_threads", "threads", async (id, msg) => {
    try {
      console.log("getting thread", id)
      await downloadThread(id);

      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })




  mkQueueReader("al_areas", "area_info", async (id, msg) => {
    try {
      console.log("getting areainfo", id)
      await downloadAreaInfo(id)

      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })

  mkQueueReader("al_areas", "area_subareas", async (id, msg) => {
    try {
      console.log("getting area_subareas", id)
      await downloadAreaSubareas(id)

      msg.finish();
    } catch (e) {
      console.log("error handling!", e)
    }
  })


  // I need both areaId and placementId for placement info, so this is a dirty copy-paste of mkQueueReader
  // I could make a fancy abstraction to process the body, but this is the only thing that would use it
  {
    const topic = "al_placements";
    const channel = "placementinfo";

    const reader = new nsq.Reader(topic, channel, {
      lookupdHTTPAddresses: '192.168.150.1:4161',
      maxInFlight: 1,
    })

    reader.on('message', async msg => {
      const body = msg.body.toString();
      console.log(`${new Date().toISOString()} [${topic}] msg ${msg.id}: "${body}" (attempt #${msg.attempts})`)
      const [ areaId, placementId ] = body.split(',')
      if (isMongoId(areaId) && isMongoId(placementId)) {
        await downloadPlacementInfo({ areaId, placementId })
      }
      else {
        console.warn("message was not a mongoId! ignoring")
      }

      await Bun.sleep(3000)
      msg.finish()
    })

    reader.connect()
  }


}



startQueueHandlers()
await rollAreaRoulette()


/* TODO:
- feed all areaIds from archiver/areas using to_nsq
- re-feed areaIds from archiver2/area/info, the subareas queue did not get everything
- re-feed thingIds from arhiver/thing/info, the tags endpoint was created late
- get placement infos
- check if data/person/areasearch has the same number of files as data/person/info - I might have messed up
*/
