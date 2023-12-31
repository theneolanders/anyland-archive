import z from 'zod'

export const ItemInfoSchema = z.object({
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



export const PersonInfoSchema = z.union([
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



export const Gift = z.object({
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
export type Gift = z.infer<typeof Gift>;

export const PersonGiftsReceived = z.union([
  z.object({
    gifts: z.array(Gift)
  }),
  z.object({}).strict()
]);




export const AreaListArea = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  playerCount: z.number(),
}).strict()


export const AreaList = z.object({
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
}).strict()

export const AreaSearchSchema = z.object({
  areas: z.array(AreaListArea),
  ownPrivateAreas: z.array(AreaListArea),
}).strict()







export const ForumListSchema = z.object({
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
    }).strict()
  )
}).strict()


const ForumSchema = z.object({
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
}).strict()

export const ForumForumSchema = z.object({
  ok: z.boolean(),
  forum: ForumSchema,
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
    }).strict()
  )
}).strict()

const CommentSchema = z.object({
  date: z.string().datetime(),
  userId: z.string(),
  userName: z.string(),
  text: z.string(),
  lastEditedDate: z.string().optional(),
  likes: z.array(z.string()).optional(),
  oldestLikes: z.array(z.object({ id: z.string(), n: z.string() })).optional(),
  newestLikes: z.array(z.object({ id: z.string(), n: z.string() })).optional(),
  totalLikes: z.number().optional(),
  thingId: z.string().optional(),
}).strict()

export const ThreadsSchema = z.object({
  ok: z.boolean(),
  forum: ForumSchema.extend({ id: z.string() }),
  thread: z.object({
    forumId: z.string(),
    title: z.string(),
    titleClarification: z.string().optional(),
    creatorId: z.string(),
    creatorName: z.string(),
    latestCommentDate: z.string().datetime(),
    commentCount: z.number(),
    comments: z.array(CommentSchema),
    isLocked: z.boolean(),
    isSticky: z.boolean(),
    creationDate: z.string().datetime(),
    latestCommentText: z.string(),
    latestCommentUserId: z.string(),
    latestCommentUserName: z.string(),
    id: z.string()
  }).strict()
}).strict()

