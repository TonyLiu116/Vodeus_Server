export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum GenderEnum {
  MALE = 'm',
  FEMALE = 'f',
  OTHER = 'other'
}

export enum PremiumEnum {
  NONE = 'none',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum LanguageEnum {
  NONE = 'none',
  ENGLISH = 'English',
  FRENCH = 'French',
  PORTUGUESE = 'Portuguese'
}

export enum FriendsStatusEnum {
  NONE = 'none',
  ACCEPTED = 'accepted',
  PENDING = 'pending',
  BLOCKED = 'blocked',
}

export enum NotificationTypeEnum {
  LIKE_RECORD = 'likeRecord',
  LIKE_ANSWER = 'likeAnswer',
  NEW_STORY = 'newStory',
  NEW_ANSWER = 'newAnswer',
  FRIEND_REQUEST = 'friendRequest',
  FRIEND_ACCEPT = 'friendAccept',
  FRIEND_DELETE = 'friendDelete',
  USER_BLOCK = 'userBlock',
  USER_FOLLOW = 'userFollow',
  TAG_FRIEND = 'tagFriend',
  POST_OLD_STORY = 'oldStory',
  NEW_COMMENT = 'newComment',
  NEW_REPLY = 'newReply',
  NEW_BIO_REPLY = 'newBioReply',
  NEW_GIF_REPLY = 'newGifReply'
}

export enum FileTypeEnum {
  AUDIO = 'audio',
  IMAGE = 'image',
}

export enum StoryTypeEnum {
  RECORD = "record",
  ANSWER = "answer",
  REPLY_ANSWER = "replyAnswer"
}

export interface tagUser {
  id:string,
  name: string
}
