import { d, mkQuery } from './lib/utils';
import { mkWriter } from './lib/nsq'
import { mkApiReqs } from './lib/api';
import { ForumForumSchema, ForumListSchema, } from './lib/schemas';


if (!process.env.ANYLAND_COOKIE) throw "no cookie in env"
if (!process.env.NSQD_HOST) throw "no cookie in env"

const NSQD_HOST = process.env.NSQD_HOST;
const NSQD_PORT = 4150;

const { sendNetRequest, enqueueThing, enqueuePlayer, enqueueArea, enqueueForum, enqueueThread } = await mkWriter(NSQD_HOST, NSQD_PORT);
const api = await mkApiReqs(sendNetRequest);





//////////////////////////////
//////////////////////////////



const downloadForum = mkQuery(
  "downloadForum",
  (id) => "data/forum/forum/" + id + ".json",
  (id) => api.get( "downloadForum", "/forum/forum/" + id),
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
  true,
  3000
);

api.bumpToken();
setInterval(api.bumpToken, 30000);

const favforums = await api.get("download default fav boards", "/forum/favorites").then(res => res.json()).then(ForumListSchema.parseAsync)
for (const forum of favforums.forums) {
  console.log(d(), "downloading", forum.id, forum.name, forum.description, forum.threadCount, forum.latestCommentDate)
  await downloadForum(forum.id)
}



const alphanumeric = '-_abcdefghijklmnopqrstuvwxyz0123456789';
for (let i = 0; i < alphanumeric.length; i++) {
  const char = alphanumeric[i]
  console.log("Finding forums with", char);
  const body = await api.post("findAllForums", "/forum/search", `searchTerm=${char}`).then(res => res.json()).then(ForumListSchema.parseAsync)

  for (const forum of body.forums) {
    console.log(d(), "downloading", forum.id, forum.name, forum.description, forum.threadCount, forum.latestCommentDate)
    await downloadForum(forum.id)

    // NOTE: We sleep in downloadForum instead of here to avoid sleeping on boards we've skipped
  }

  await Bun.sleep(1500);
}



