import * as path from "node:path"
import { Elysia, t } from 'elysia'

const HOSTNAME_CDN_THINGDEFS = "d6ccx151yatz6.cloudfront.net"
const HOSTNAME_CDN_AREABUNDLES = "d26e4xubm8adxu.cloudfront.net"

const app = new Elysia()
	.post('/auth/start', () => {
        return {
            vMaj: 188,
            vMinSrv: 1,
            personId:   '5a18e948df317fa919191919',
            homeAreaId: '5a18e948df317fa5161076c3',
            screenName: 'singleplayer explorer',
            statusText: 'exploring around',
            isFindable: true,
            age: 2226,
            ageSecs: 192371963,
            attachments: '{"0":{"Tid":"58a983128ca4690c104b6404","P":{"x":0,"y":0,"z":-1.4901161193847656e-7},"R":{"x":0,"y":0,"z":0}},"2":{"Tid":"58965e04569548a0132feb5e","P":{"x":-0.07462535798549652,"y":0.17594149708747864,"z":0.13412480056285858},"R":{"x":87.7847671508789,"y":73.62593841552734,"z":99.06474304199219}},"6":{"Tid":"58a25965b5fa68ae13841fb7","P":{"x":-0.03214322030544281,"y":-0.028440749272704124,"z":-0.3240281939506531},"R":{"x":306.4596862792969,"y":87.87753295898438,"z":94.79550170898438}},"7":{"Tid":"58965dfd9e2733c413d68d05","P":{"x":0.0267937108874321,"y":-0.03752899169921875,"z":-0.14691570401191711},"R":{"x":337.77911376953125,"y":263.3216857910156,"z":78.18708038330078}}}',
            isSoftBanned: false,
            showFlagWarning: false,
            flagTags: [],
            areaCount: 1,
            thingTagCount: 1,
            allThingsClonable: true,
            achievements: [
                30, 7, 19, 4, 20, 11, 10,
                5, 9, 17, 13, 12, 16, 37,
                34, 35, 44, 31, 15, 27, 28
            ],
            hasEditTools: true,
            hasEditToolsPermanently: false,
            editToolsExpiryDate: '2024-01-30T15:26:27.720Z',
            isInEditToolsTrial: true,
            wasEditToolsTrialEverActivated: true,
            customSearchWords: ''
        }
    })
    .post( "/p", () => ({ "vMaj": 188, "vMinSrv": 1 }) )
    .post(
        "/area/load",
        ({body: { areaId }}) => Bun.file(path.resolve("./data/area/load/", areaId + ".json")),
        { body: t.Object({ areaId: t.String(), isPrivate: t.Boolean()}) }
    )
    .post(
        "/area/info",
        ({body: { areaId }}) => Bun.file(path.resolve("./data/area/info/", areaId + ".json")).json(),
        { body: t.Object({ areaId: t.String() }) }
    )
    .get(
        "/:areaId/:areaKey", // TODO: areaKeys all seem to start with "rr"
        ({params: { areaId, areaKey }}) => Bun.file(path.resolve("./data/area/bundle/", areaId , areaKey + ".json")),
        { headers: t.Object({ "x-forwarded-host": t.Literal(HOSTNAME_CDN_AREABUNDLES) }) }
    )
    .post(
        "/placement/info",
        ({body: { areaId, placementId }}) => Bun.file(path.resolve("./data/placement/info/", areaId, placementId + ".json")).json(),
        { body: t.Object({ areaId: t.String(), placementId: t.String() }) }
    )
    .get("/thing/info/:thingId",
        ({params: { thingId }}) => Bun.file(path.resolve("./data/thing/info/", thingId + ".json")).json(),
    )
    .get("/thing/sl/tdef/:thingId",
        ({params: { thingId }}) => Bun.file(path.resolve("./data/thing/def/", thingId + ".json")).json(),
    )
    .get(
        "/:thingId",
        ({params: { thingId }}) => Bun.file(path.resolve("./data/thing/def/", thingId + ".json")).json(),
        { headers: t.Object({ "x-forwarded-host": t.Literal(HOSTNAME_CDN_THINGDEFS) }) }
    )
    .post(
        "/thing/gettags",
        ({body: { thingId }}) => Bun.file(path.resolve("./data/thing/tags/", thingId + ".json")).json(),
        { body: t.Object({ thingId: t.String() }) }
    )
    .post(
        "/thing/getflag",
        ({}) => ({ isFlagged: false }),
        { body: t.Object({ id: t.String() }) }
    )
    .post(
        "/gift/getreceived",
        ({body: { userId }}) => Bun.file(path.resolve("./data/person/gift/", userId + ".json")),
        { body: t.Object({ userId: t.String() }) }
    )
    .get("/forum/favorites",
        () => {
            return {
                "forums": [
                  {
                    "name": "help",
                    "description": "for all your anyland questions",
                    "creatorId": "5773b5232da36d2d18b870fb",
                    "creatorName": "philipp",
                    "threadCount": 346,
                    "latestCommentDate": "2023-12-21T09:35:12.880Z",
                    "protectionLevel": 0,
                    "creationDate": "2016-12-06T16:31:52.285Z",
                    "dialogThingId": "58481eb85a0dc5b20d48e6f8",
                    "dialogColor": "255,255,255",
                    "latestCommentText": "this is epic!",
                    "latestCommentUserId": "622d80e81ee78204797e0e4e",
                    "latestCommentUserName": "Captain Crunch",
                    "id": "5846f540e8593a971395c0aa"
                  },
                  {
                    "name": "events",
                    "description": "find and post dates for your events... parties, games, celebrations, anything!",
                    "creatorId": "5773b5232da36d2d18b870fb",
                    "creatorName": "philipp",
                    "threadCount": 60,
                    "latestCommentDate": "2023-10-08T20:42:08.929Z",
                    "protectionLevel": 0,
                    "creationDate": "2016-12-06T16:42:27.699Z",
                    "dialogThingId": "5848394801371c5c136a9ea3",
                    "dialogColor": "100,194,226",
                    "latestCommentText": "penis fuck",
                    "latestCommentUserId": "6003833e11e60605a2d7cb15",
                    "latestCommentUserName": "Sheep",
                    "id": "5846f54d5a84a62410ce2e66"
                  },
                  {
                    "name": "updates",
                    "description": "find out what's new with anylad. feature announcements and bug fix info. thanks all!",
                    "creatorId": "5773b5232da36d2d18b870fb",
                    "creatorName": "philipp",
                    "threadCount": 426,
                    "latestCommentDate": "2023-12-13T00:16:12.269Z",
                    "protectionLevel": 1,
                    "creationDate": "2016-12-06T15:17:21.186Z",
                    "dialogThingId": "58483a3b5a0dc5b20d48e6fe",
                    "dialogColor": "75,226,187",
                    "latestCommentText": "im gonna miss it for sure",
                    "latestCommentUserId": "57fa1a9a062bfb6013e320e9",
                    "latestCommentUserName": "cet cherinyakov",
                    "id": "5846f556b09fa5d709e5f6fe"
                  },
                  {
                    "name": "showcase",
                    "description": "",
                    "creatorId": "5773b5232da36d2d18b870fb",
                    "creatorName": "philipp",
                    "threadCount": 217,
                    "latestCommentDate": "2023-10-12T18:37:22.004Z",
                    "protectionLevel": 0,
                    "creationDate": "2016-12-06T15:17:21.186Z",
                    "dialogThingId": "58483d2d6243c7d410fc910f",
                    "dialogColor": "223,226,125",
                    "latestCommentText": "i'm amaze!",
                    "latestCommentUserId": "5eeeb2edcb300544abacc984",
                    "latestCommentUserName": "johnny nu",
                    "id": "5846f567b09fa5d709e5f6ff"
                  },
                  {
                    "name": "suggestions",
                    "description": "got a new feature idea for anyland, or anything that could be improved?",
                    "creatorId": "5773b5232da36d2d18b870fb",
                    "creatorName": "philipp",
                    "threadCount": 347,
                    "latestCommentDate": "2021-08-29T06:33:04.655Z",
                    "protectionLevel": 0,
                    "creationDate": "2016-12-06T16:42:28.538Z",
                    "dialogThingId": "58483e01076bf93b0e75f839",
                    "dialogColor": "198,163,88",
                    "latestCommentText": "i wonder if the game can actually handle that many script lines.",
                    "latestCommentUserId": "5d9690a7288c857ffcc8623e",
                    "latestCommentUserName": "flarn2006",
                    "id": "5846f571c966811d10993e1e"
                  },
                  {
                    "name": "hangout",
                    "description": "a board to relax and discuss all kinds of miscellaneous topics. welcome!",
                    "creatorId": "5773b5232da36d2d18b870fb",
                    "creatorName": "philipp",
                    "threadCount": 48,
                    "latestCommentDate": "2023-10-03T03:45:06.027Z",
                    "protectionLevel": 0,
                    "creationDate": "2016-12-06T16:42:27.699Z",
                    "dialogThingId": "58483fff5a7d56f91469903f",
                    "dialogColor": "198,143,132",
                    "latestCommentText": "hewoo mr obama?",
                    "latestCommentUserId": "5f911606fe99c863186d3030",
                    "latestCommentUserName": "alizard",
                    "id": "5846f5785a84a62410ce2e67"
                  },
                  {
                    "name": "quests",
                    "description": "a board to post your adventures and quests!",
                    "creatorId": "5773b5232da36d2d18b870fb",
                    "creatorName": "philipp ai",
                    "threadCount": 30,
                    "latestCommentDate": "2023-12-13T12:19:04.618Z",
                    "protectionLevel": 0,
                    "creationDate": "2019-01-19T15:46:36.529Z",
                    "latestCommentText": "✓ achieved",
                    "latestCommentUserId": "5af09cf138f35155f103bd92",
                    "latestCommentUserName": "Yoofaloof",
                    "dialogColor": "84,255,255",
                    "dialogThingId": "5c45b3f2dbdb1d61cf7f18b9",
                    "id": "5c43465c9e61d1567d9c69bd"
                  },
                  {
                    "name": "hhbbbggtestboaaerd",
                    "description": "testggnn",
                    "creatorId": "5a18e948df317fa5161076c2",
                    "creatorName": "siol",
                    "threadCount": 1,
                    "latestCommentDate": "2023-12-30T15:29:10.861Z",
                    "protectionLevel": 0,
                    "creationDate": "2023-12-30T15:28:20.589Z",
                    "latestCommentText": "testing",
                    "latestCommentUserId": "5a18e948df317fa5161076c2",
                    "latestCommentUserName": "siol",
                    "id": "65903714baa2b214c00654d6"
                  }
                ]
              }
        }
    )
    .get("/forum/forum/:id", ({params: { id }}) => Bun.file(path.resolve("./data/forum/forum/", id + ".json")).json() )
    .get("/forum/thread/:id", ({params: { id }}) => Bun.file(path.resolve("./data/forum/thread/", id + ".json")).json() )
	.listen({
        hostname: process.env.host,
        port: process.env.port
    })

console.log(`🦊 Elysia is running at on port ${app.server?.port}...`)
