import { BadRequestException, ConsoleLogger, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AnswersEntity, AnswerTypeEnum } from "../entities/answers.entity";
import { ReplyAnswersEntity } from "src/entities/reply-answer.entity";
import { Repository, getConnection, In } from "typeorm";
import { LikesEntity, LikeTypeEnum } from "../entities/llikes.entity";
import { RecordsEntity } from "../entities/records.entity";
import { FileService } from "../files/file.service";
import { MailsService } from "../mail/mail.service";
import { RecordsService } from "../records/records.service";
import { UsersEntity } from "../entities/users.entity";
import { FriendsEntity } from "../entities/friends.entity";
import { FileTypeEnum, FriendsStatusEnum, NotificationTypeEnum, StoryTypeEnum } from "../lib/enum";
import { CountryEntity } from "../entities/countries.entity";
import { NotificationsService } from "src/notifications/notifications.service";
import { ReportsEntity, ReportTypeEnum } from "src/entities/reports.entity";
import { ReactionsEntity } from "src/entities/reaction.entity";
import { filter, find } from "lodash";
import { TagsEntity } from "src/entities/tag.entity";
import { UsersService } from "src/users/users.service";
import { HistoryTypeEnum } from "src/entities/history.entity";
import { MessagesEntity } from "src/entities/message.entity";
import { ConversationsEntity } from "src/entities/conversations.entity";
import { Twilio } from 'twilio';
import { ConfigService } from "nestjs-config";
import { throwIfEmpty } from "rxjs";
import { RecordDto } from "src/records/dto/record.dto";
import { RecordImgDto } from "./dto/recordImg.dto";

@Injectable()
export class ActionsService {
  private twilioClient: Twilio;
  constructor(
    @InjectRepository(AnswersEntity) private answersRepository: Repository<AnswersEntity>,
    @InjectRepository(ReplyAnswersEntity) private replyAnswersRepository: Repository<ReplyAnswersEntity>,
    @InjectRepository(MessagesEntity) private MessagesRepository: Repository<MessagesEntity>,
    @InjectRepository(LikesEntity) private likesRepository: Repository<LikesEntity>,
    @InjectRepository(ReactionsEntity) private reactionsRepository: Repository<ReactionsEntity>,
    @InjectRepository(RecordsEntity) private recordsRepository: Repository<RecordsEntity>,
    @InjectRepository(UsersEntity) private usersRepository: Repository<UsersEntity>,
    @InjectRepository(TagsEntity) private tagsRepository: Repository<TagsEntity>,
    @InjectRepository(FriendsEntity) private friendsRepository: Repository<FriendsEntity>,
    @InjectRepository(CountryEntity) private countriesRepository: Repository<CountryEntity>,
    @InjectRepository(ReportsEntity) private reportsRepository: Repository<ReportsEntity>,
    @InjectRepository(ConversationsEntity) private conversationsRepository: Repository<ConversationsEntity>,
    private readonly filesService: FileService,
    private readonly notificationService: NotificationsService,
    private mailService: MailsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    const accountSid = this.configService.get('app.twilio_account_sid');
    const authToken = this.configService.get('app.twilio_auth_token');
    this.twilioClient = new Twilio(accountSid, authToken);
  }

  async answerBio(user, recordId, receiverId, bio, isCommented = '') {
    const findRecord = await this.recordsRepository.createQueryBuilder("record")
      .leftJoin('record.user', 'user')
      .where({ id: recordId })
      .select(["record.id", "user.id", "user.email"])
      .getOne();

    if (!findRecord) {
      throw new NotFoundException("record not found");
    }
    const entity = new AnswersEntity();
    entity.type = AnswerTypeEnum.BIO;
    entity.record = findRecord;
    entity.createdAt = new Date();
    entity.user = user;
    entity.bio = bio;
    // let i = 0, j = 0, tp = '', tagNames = [];
    // for (i = 0; i < bio.length; i++) {
    //   if (bio[i] != '@') continue;
    //   for (j = i + 1; j < bio.length; j++) {
    //     if (bio[j] == ' ') break;
    //   }
    //   if (j > i + 1) {
    //     tp = bio.slice(i + 1, j);
    //     tagNames.push(tp);
    //   }
    // }
    // if (tagNames.length) {
    //   let tagFriends = await this.usersRepository.createQueryBuilder("users")
    //     .select(["users.id", "users.name"])
    //     .where("users.name in (:...tagNames)", { tagNames })
    //     .getMany();
    //   let tagIds = tagFriends.map((el) => el.id);
    //   await this.tagFriends(user, 'record', tagIds, recordId);
    // }
    await this.usersService.addScore(user, 3);
    await this.mailService.sentNotifyToStoryOwner(user.id, receiverId, findRecord.id, findRecord.createdAt);
    if (isCommented.length > 1) {
      await this.tagFriends(user, 'record', [receiverId], recordId);
      await this.mailService.sentNotifyToCommentedUser(user.id, isCommented);
    }
    await this.notificationService.sendNotification(user, receiverId, recordId, null, null, NotificationTypeEnum.NEW_ANSWER)
    return this.answersRepository.save(entity);
  }

  async replyAnswerBio(user, answerId, receiverId, bio) {
    const findAnswer = await this.answersRepository.createQueryBuilder("answer")
      .where({ id: answerId })
      .select(["answer.id"])
      .getOne();

    if (!findAnswer) {
      throw new NotFoundException("record not found");
    }

    const entity = new ReplyAnswersEntity();
    entity.answer = findAnswer;
    entity.type = AnswerTypeEnum.BIO;
    entity.bio = bio;
    entity.createdAt = new Date();
    entity.user = user;

    await this.usersService.addScore(user, 3);
    await this.mailService.sentNotifyToAnswerReplyUser(user.id, receiverId);
    await this.notificationService.sendNotification(user, receiverId, null, null, null, NotificationTypeEnum.NEW_BIO_REPLY);
    return await this.replyAnswersRepository.save(entity);
  }

  async replyAnswerGif(user, answerId, receiverId, gifLink) {
    const findAnswer = await this.answersRepository.createQueryBuilder("answer")
      .where({ id: answerId })
      .select(["answer.id"])
      .getOne();

    if (!findAnswer) {
      throw new NotFoundException("record not found");
    }
    await this.usersService.addScore(user, 3);
    const entity = new ReplyAnswersEntity();
    entity.answer = findAnswer;
    entity.type = AnswerTypeEnum.GIF;
    entity.gifLink = gifLink;
    entity.createdAt = new Date();
    entity.user = user;

    await this.mailService.sentNotifyToAnswerReplyUser(user.id, receiverId);
    await this.notificationService.sendNotification(user, receiverId, null, null, null, NotificationTypeEnum.NEW_GIF_REPLY);

    return this.replyAnswersRepository.save(entity);
  }

  async answerEmoji(user, recordId, emoji) {
    const findRecord = await this.recordsRepository.createQueryBuilder("record")
      .leftJoin('record.user', 'user')
      .where({ id: recordId })
      .select(["record.id", "user.id", "user.email"])
      .getOne();

    if (!findRecord) {
      throw new NotFoundException("record not found");
    }
    const entity = new AnswersEntity();
    entity.type = AnswerTypeEnum.EMOJI;
    entity.record = findRecord;
    entity.createdAt = new Date();
    entity.user = user;
    entity.emoji = emoji;
    return this.answersRepository.save(entity);
  }

  async answerGif(user, recordId, receiverId, link) {
    const findRecord = await this.recordsRepository.createQueryBuilder("record")
      .leftJoin('record.user', 'user')
      .where({ id: recordId })
      .select(["record.id", "user.id", "user.email"])
      .getOne();

    if (!findRecord) {
      throw new NotFoundException("record not found");
    }

    await this.usersService.addScore(user, 3);
    const entity = new AnswersEntity();
    entity.type = AnswerTypeEnum.GIF;
    entity.record = findRecord;
    entity.createdAt = new Date();
    entity.user = user;
    entity.gifLink = link;
    await this.mailService.sentNotifyToStoryOwner(user.id, receiverId, findRecord.id, findRecord.createdAt);
    return this.answersRepository.save(entity);
  }

  async addRecordImage(body: RecordImgDto, buffer, filename) {
    const uploadFile = await this.filesService.uploadFile(buffer, filename, FileTypeEnum.IMAGE);
    return await this.recordsRepository.update(body.recordId, { imgFile: uploadFile });
  }

  async addRecordText(body: RecordDto, user, file) {
    const uploadImageFile = await this.filesService.uploadFile(file.buffer, file.originalname, FileTypeEnum.IMAGE);
    const entity = new RecordsEntity();
    entity.imgFile = uploadImageFile;
    entity.privacy = body.privacy;
    entity.user = user;
    entity.notSafe = body.notSafe;
    entity.category = body.category;
    entity.text = body.recordText;
    const friends = await this.findUsersByFriendId(user.id);
    const friendUsers = friends.map((el, index) => el.user.id);
    const receivers = await this.usersRepository.find({ where: { id: In(friendUsers) } });
    const res = await this.recordsRepository.save(entity);
    receivers.forEach(async el => {
      await this.notificationService.sendNotification(user, el, res, null, null, NotificationTypeEnum.NEW_STORY);
    })
    await this.mailService.sentNotifyToFriends(user.id, res.id, res.createdAt);
    await this.usersService.addScore(user, 8);
    return res;
  }

  async addRecord(body: RecordDto, user, voiceFile, imageFile, isPast) {
    const uploadVoiceFile = voiceFile ? await this.filesService.uploadFile(voiceFile[0].buffer, voiceFile[0].originalname, FileTypeEnum.AUDIO) : null;
    const uploadImageFile = imageFile ? await this.filesService.uploadFile(imageFile[0].buffer, imageFile[0].originalname, FileTypeEnum.IMAGE) : null;
    const rand = Math.floor(Math.random() * (3));
    const entity = new RecordsEntity();
    if (uploadVoiceFile) entity.file = uploadVoiceFile;
    if (uploadImageFile) entity.imgFile = uploadImageFile;
    entity.title = body.title;
    entity.text = body.content;
    entity.emoji = body.emoji;
    entity.duration = body.duration;
    entity.user = user;
    entity.colorType = rand;
    entity.privacy = body.privacy;
    entity.notSafe = body.notSafe;
    entity.temporary = body.temporary;
    entity.category = body.category;
    if (body.address)
      entity.address = body.address;
    // if (body.createdAt != '') {
    //   let tempCreatedAt = new Date(body.createdAt);
    //   tempCreatedAt.setHours(23);
    //   entity.createdAt = tempCreatedAt;
    // }
    // const followers = await this.friendsRepository
    //   .createQueryBuilder('friends')
    //   .leftJoin("friends.friend","friend")
    //   .where({ status: "accepted" })
    //   .andWhere({ user: user.id })
    //   .select([
    //     'friends.id',
    //     'friend.id'
    //   ]).getMany();
    const friends = await this.findUsersByFriendId(user.id);
    const friendUsers = friends.map((el, index) => el.user.id);
    const receivers = await this.usersRepository.find({ where: { id: In(friendUsers) } });
    const res = await this.recordsRepository.save(entity);
    if (isPast) {
      receivers.forEach(async el => {
        await this.notificationService.sendNotification(user, el, res, null, null, NotificationTypeEnum.POST_OLD_STORY);
      })
    } else {
      await this.usersService.addScore(user, 8);
      receivers.forEach(async el => {
        await this.notificationService.sendNotification(user, el, res, null, null, NotificationTypeEnum.NEW_STORY);
      })
    }
    if (isPast) {
      await this.mailService.sentNotifyToFriendsPastStory(user.id, res.id, res.createdAt);
    } else {
      await this.mailService.sentNotifyToFriends(user.id, res.id, res.createdAt);
    }
    console.log("return res:::")
    return res;
  }

  findUsersByFriendId(friendId) {
    return this.friendsRepository
      .createQueryBuilder("friends")
      .where({ friend: friendId, status: FriendsStatusEnum.ACCEPTED })
      .innerJoin("friends.user", "user")
      .select([
        "friends.id",
        "friends.status",
        "user.id",
        "user.email"
      ])
      .getMany();
  }

  async answerToRecord(user, record, duration, emoji, buffer, filename) {
    const findRecord = await this.recordsRepository.createQueryBuilder("record")
      .leftJoin('record.user', 'user')
      .where({ id: record })
      .select(["record.id", "user.id", "user.email"])
      .getOne();

    if (!findRecord) {
      throw new NotFoundException("record not found");
    }

    const findUser = await this.usersRepository.findOne({ where: { id: user.id } });
    const uploadFile = await this.filesService.uploadFile(buffer, filename, FileTypeEnum.AUDIO);
    const entity = new AnswersEntity();
    entity.type = AnswerTypeEnum.VOICE;
    entity.record = findRecord;
    entity.duration = duration;
    entity.file = uploadFile;
    entity.createdAt = new Date();
    entity.user = user;
    entity.emoji = emoji;

    if (findRecord.user.id != user.id) {
      await this.usersService.addScore(user, 3);
      const touser = await this.usersRepository.findOne({ where: { id: findRecord.user.id } });
      await this.notificationService.sendNotification(user, touser, findRecord, entity, null, NotificationTypeEnum.NEW_ANSWER);
      let usersId = [];
      usersId.push(findRecord.user.id);
      let description = {
        eg: `${findUser.name} answered you! 🤩`,
        fr: `${findUser.name} t'a répondu ! 🤩`
      }
      await this.mailService.sentNotifyToUser(usersId, description, { nav: "VoiceProfile", params: { id: findRecord.id, answerId: entity.id } });
    }

    return this.answersRepository.save(entity);
  }

  async deleteTag(user, id = "") {
    const findTag = await this.tagsRepository.findOne({ where: { id }, relations: ["user"] })
    if (!findTag) {
      throw new NotFoundException()
    }
    if (user.id != findTag.user.id) {
      throw new BadRequestException("Invalid User");
    }
    return this.tagsRepository.remove(findTag)
  }

  async deleteChat(user, id = "") {
    const findChat = await this.conversationsRepository
      .createQueryBuilder("chat")
      .leftJoin("chat.sender", "sender")
      .select([
        "chat.id",
        "sender.id"
      ])
      .getOne();
    if (!findChat) {
      throw new NotFoundException()
    }
    if (findChat.sender.id == user.id)
      return await this.conversationsRepository.remove(findChat);
    else {
      return await this.conversationsRepository.update(id, { visible: false });
    }
  }

  async tagFriends(user, storyType, tagUserIds, recordId) {
    const findUser = await this.usersRepository.findOne({ where: { id: user.id } });
    if (storyType == StoryTypeEnum.RECORD) {
      // const findTag = await this.tagsRepository
      //   .createQueryBuilder("tags")
      //   .select([
      //     "tags.id",
      //     "tags.userIds"
      //   ])
      //   .where({ user: user.id, record: recordId })
      //   .getOne();
      // if (findTag) {
      //   let oldUsers = findTag.userIds;
      //   const newUsers = [...new Set([...oldUsers, ...tagUserIds])];
      //   await this.tagsRepository.update(findTag.id, { userIds: newUsers });
      // }
      // else {
      //   const tag = new TagsEntity();
      //   tag.user = user.id;
      //   tag.record = recordId;
      //   tag.type = StoryTypeEnum.RECORD;
      //   tag.userIds = tagUserIds;
      //   await this.tagsRepository
      //     .createQueryBuilder()
      //     .insert()
      //     .into(TagsEntity)
      //     .values(tag)
      //     .execute();
      // }
      let description = {
        eg: `${findUser.name} has tagged you in a comment! 🤩`,
        fr: `${findUser.name} t’as identifié dans en commentaire ! 🤩`
      }
      // this.mailService.sentNotifyToUser(tagUserIds, description, { nav: "VoiceProfile", params: { id: recordId } });
      // this.mailService.sentNotifyToUser(tagUserIds, description, { nav: "Notification", params: {  } });
      tagUserIds.map(async toUserId => {
        await this.notificationService.sendNotification(user, toUserId, recordId, null, null, NotificationTypeEnum.TAG_FRIEND);
      });
    }
    else if (storyType == StoryTypeEnum.ANSWER) {

    }
    else if (storyType == StoryTypeEnum.REPLY_ANSWER) {

    }
    return 1;
  }

  async deleteMessages(messageIds) {
    await this.MessagesRepository.delete({ id: In(messageIds) });
  }

  async getMessages(user, toUserId, skip) {
    const messages = await this.MessagesRepository.createQueryBuilder("messages")
      .leftJoin('messages.user', 'user')
      .leftJoin('messages.toUser', 'toUser')
      .leftJoin('messages.file', 'file')
      .leftJoin('messages.record', 'record')
      .leftJoin('record.user', 'recordUser')
      .leftJoin('recordUser.avatar', 'avatar')
      .leftJoin('record.file', 'recordFile')
      .select([
        "messages.id",
        "messages.type",
        "messages.emoji",
        "messages.bio",
        "messages.gif",
        "messages.duration",
        "messages.ancestorId",
        "messages.createdAt",
        "user.id",
        "toUser.id",
        "file.url",
        'record.id',
        'record.title',
        'record.likesCount',
        'record.listenCount',
        'record.duration',
        'record.createdAt',
        'recordUser.id',
        'recordUser.name',
        'recordUser.avatarNumber',
        'avatar.url',
        'recordFile.url'
      ])
      .where({ user: user.id, toUser: toUserId })
      .orWhere({ user: toUserId, toUser: user.id })
      .orderBy("messages.createdAt", "DESC")
      .skip(skip)
      .take(15)
      .getMany();
    ;
    if (messages.length > 0) {
      const findConversation = await this.conversationsRepository.createQueryBuilder("conversation")
        .leftJoin('conversation.sender', 'sender')
        .leftJoin('conversation.receiver', 'receiver')
        .select([
          "conversation.id",
          "conversation.newsCount",
          "sender.id",
          "receiver.id",
        ])
        .where({ sender: user.id, receiver: toUserId })
        .orWhere({ sender: toUserId, receiver: user.id })
        .getOne();

      if (findConversation.sender.id == toUserId && findConversation.newsCount > 0) {
        await this.conversationsRepository.update(findConversation.id, { newsCount: 0 });
      }
    }
    messages.reverse();
    return messages;
  }


  async confirmMessage(user, toUserId) {
    await this.conversationsRepository.createQueryBuilder("conversation").update().set({ newsCount: 0 }).where({ sender: toUserId, receiver: user.id }).execute();
  }

  async getConversations(user) {
    const conversations = await this.conversationsRepository.createQueryBuilder("conversation")
      .leftJoin('conversation.sender', 'sender')
      .leftJoin('sender.avatar', 'senderAvatar')
      .leftJoin('conversation.receiver', 'receiver')
      .leftJoin('receiver.avatar', 'receiverAvatar')
      .select([
        "conversation.id",
        "conversation.newsCount",
        "conversation.updatedAt",
        "conversation.emoji",
        "conversation.bio",
        "conversation.type",
        "conversation.visible",
        "sender.id",
        "sender.name",
        "sender.premium",
        "sender.avatarNumber",
        "sender.phoneNumber",
        "senderAvatar.url",
        "receiver.id",
        "receiver.name",
        "receiver.premium",
        "receiver.avatarNumber",
        "receiver.phoneNumber",
        "receiverAvatar.url"
      ])
      .where({ sender: user.id })
      .orWhere({ receiver: user.id })
      .orderBy("conversation.updatedAt", "DESC")
      .getMany();
    return conversations;
  }

  async getTagUsers(user, tagId: string) {
    const findTag = await this.tagsRepository.findOne({ where: { id: tagId } });
    const queryBuilder = this.usersRepository.createQueryBuilder("user")
      .leftJoin('user.avatar', 'avatar')
      .select([
        "user.id",
        "user.name",
        "user.premium",
        "user.avatarNumber",
        "user.phoneNumber",
        "avatar.url"
      ])
      .where({ id: In(findTag.userIds) })
      ;
    return await queryBuilder.getMany();
  }

  compare(a, b) {
    return b.recordsCount - a.recordsCount;
  }

  async getActiveUsers() {
    const users = await this.usersRepository.createQueryBuilder("user")
      .leftJoin('user.avatar', 'avatar')
      .loadRelationCountAndMap("user.recordsCount", "user.records", "records")
      .select([
        "user.id",
        "user.name",
        "user.premium",
        "user.avatarNumber",
        "user.phoneNumber",
        "avatar.url"
      ])
      .getMany();
    users.sort(this.compare);
    return users.slice(0, 20);
  }

  async getTags(user, storyId, storyType) {
    if (storyType == StoryTypeEnum.RECORD) {
      let tags = await this.tagsRepository
        .createQueryBuilder("tags")
        .where({ record: storyId })
        .leftJoin("tags.user", "user")
        .leftJoin("user.avatar", "avatar")
        .select([
          "tags.id",
          "tags.userIds",
          "tags.createdAt",
          "tags.likesCount",
          "user.id",
          "user.name",
          "user.avatarNumber",
          "user.phoneNumber",
          "avatar.url"
        ])
        .getMany();
      const tagIds = tags.map((el) => el.id);
      const likes = tagIds.length ? await this.getTagLikesByIds(tagIds, user.id) : [];
      return tags.map((el, index) => {
        const findUserLike = find(likes, (obj) => (obj.tagFriend.id === el.id));
        return {
          ...el,
          isLiked: findUserLike ? true : false,
        };
      });
    }
    return 0;
  }

  getTagLikesByIds(ids, userId): Promise<LikesEntity[]> {
    return this.likesRepository
      .createQueryBuilder("likes")
      .innerJoin("likes.tagFriend", "tagFriend", "tagFriend.id in (:...ids)", { ids })
      .leftJoin("likes.user", "user")
      .select([
        "likes.id",
        "likes.isLike",
        "user.id",
        "tagFriend.id"
      ])
      .where({ user: userId })
      .andWhere({ isLike: true })
      .getMany();
  }

  getAnswerBioLikesByIds(ids, userId): Promise<LikesEntity[]> {
    return this.likesRepository
      .createQueryBuilder("likes")
      .innerJoin("likes.answerBio", "answerBio", "answerBio.id in (:...ids)", { ids })
      .leftJoin("likes.user", "user")
      .select([
        "likes.id",
        "likes.isLike",
        "user.id",
        "answerBio.id"
      ])
      .where({ user: userId })
      .andWhere({ isLike: true })
      .getMany();
  }

  getAnswerEmojiLikesByIds(ids, userId): Promise<LikesEntity[]> {
    return this.likesRepository
      .createQueryBuilder("likes")
      .innerJoin("likes.answerEmoji", "answerEmoji", "answerEmoji.id in (:...ids)", { ids })
      .leftJoin("likes.user", "user")
      .select([
        "likes.id",
        "likes.isLike",
        "user.id",
        "answerEmoji.id"
      ])
      .where({ user: userId })
      .andWhere({ isLike: true })
      .getMany();
  }

  getAnswerGifLikesByIds(ids, userId): Promise<LikesEntity[]> {
    return this.likesRepository
      .createQueryBuilder("likes")
      .innerJoin("likes.answerGif", "answerGif", "answerGif.id in (:...ids)", { ids })
      .leftJoin("likes.user", "user")
      .select([
        "likes.id",
        "likes.isLike",
        "user.id",
        "answerGif.id"
      ])
      .where({ user: userId })
      .andWhere({ isLike: true })
      .getMany();
  }

  async replyToAnswer(user, answer, duration, buffer, filename, receiverId) {
    const findAnswer = await this.answersRepository.createQueryBuilder("answer")
      .where({ id: answer })
      .select(["answer.id"])
      .getOne();

    if (!findAnswer) {
      throw new NotFoundException("record not found");
    }

    const uploadFile = await this.filesService.uploadFile(buffer, filename, FileTypeEnum.AUDIO);
    const entity = new ReplyAnswersEntity();
    entity.answer = findAnswer;
    entity.duration = duration;
    entity.file = uploadFile;
    entity.createdAt = new Date();
    entity.user = user;

    await this.usersService.addScore(user, 3);
    await this.mailService.sentNotifyToAnswerReplyUser(user.id, receiverId);
    await this.notificationService.sendNotification(user, receiverId, answer.record, null, null, NotificationTypeEnum.NEW_REPLY);

    return this.replyAnswersRepository.save(entity);
  }

  async addMessage(user, body, file) {
    let toUserId = body.user, type = body.type, duration = body.duration, ancestorId = body.ancestor, emoji = body.emoji, record = body.record;
    const findUser = await this.usersRepository.findOne({ where: { id: toUserId } });
    const sender = await this.usersRepository.findOne({ where: { id: user.id } });

    if (!findUser) {
      throw new NotFoundException("user not found");
    }

    const findConversation = await this.conversationsRepository.createQueryBuilder("conversation")
      .leftJoin('conversation.sender', 'sender')
      .leftJoin('conversation.receiver', 'receiver')
      .select([
        "conversation.id",
        "sender.id",
        "receiver.id",
      ])
      .where({ sender: user.id, receiver: toUserId })
      .orWhere({ sender: toUserId, receiver: user.id })
      .getOne();

    if (findConversation) {
      if (findConversation.sender.id == user.id) {
        await this.conversationsRepository.update(findConversation.id, { newsCount: () => '"newsCount" + 1', type: type, emoji: emoji, bio: body.bio, visible: true });
      }
      else {
        await this.conversationsRepository.update(findConversation.id, { newsCount: 1, sender: user.id, receiver: toUserId, type: type, emoji: emoji, bio: body.bio, visible: true });
      }
    }
    else {
      const conversation = new ConversationsEntity();
      conversation.sender = user.id;
      conversation.receiver = toUserId;
      conversation.type = type;
      conversation.emoji = emoji;
      conversation.bio = body.bio;

      await this.conversationsRepository
        .createQueryBuilder()
        .insert()
        .into(ConversationsEntity)
        .values(conversation)
        .execute();
    }

    const uploadFile = file ? await this.filesService.uploadFile(file.buffer, file.originalname, type == 'voice' ? FileTypeEnum.AUDIO : FileTypeEnum.IMAGE) : null;
    const entity = new MessagesEntity();
    entity.type = type;
    entity.toUser = findUser;
    entity.duration = duration;
    entity.file = uploadFile;
    entity.record = record;
    entity.user = user;
    entity.ancestorId = ancestorId;
    entity.emoji = emoji;
    entity.bio = body.bio;
    entity.gif = body.gif
    let usersId = [];
    usersId.push(toUserId);
    let description;
    if (type == 'emoji')
      description = {
        eg: `${sender.name} has reacted to your message 😎`,
        fr: `${sender.name} a réagi a ton message 😎`,
      }

    else if (type == 'photo')
      description = {
        eg: `${sender.name} has sent you a photo 😉`,
        fr: `${sender.name} t'a envoyé une photo 😉`,
      }
    else
      description = {
        eg: `${sender.name} has sent you a message 🤭`,
        fr: `${sender.name} t'a envoyé un message vocal 🤭`,
      }
    await this.mailService.sentNotifyToUser(usersId, description, { nav: "Conversation", params: { senderId: sender.id } });
    // await this.mailService.sentNotifyToUser(usersId, description, { nav: "Notification", params: {} });
    // await this.mailService.sentNotifyToUser(usersId, description, { nav: "Conversation", params: { info: { user: sender } } });
    return this.MessagesRepository.save(entity);
  }

  async addChatMessage(body, file) {
    console.log(body, file,":body,file");
    let type = body.type
    const uploadFile = file ? await this.filesService.uploadFile(file.buffer, file.originalname, type == 'voice' ? FileTypeEnum.AUDIO : FileTypeEnum.IMAGE) : null;
    console.log(uploadFile,"uploadFile");
    return uploadFile;
  }

  async likeRecord(user, recordId) {
    const record = await this.recordsRepository.createQueryBuilder("record")
      .leftJoin('record.user', 'user')
      .where({ id: recordId })
      .select(["record.id", "record.likesCount", "user.id", "user.email"])
      .getOne();
    if (!record) {
      throw new NotFoundException();
    }

    const existingLike = await this.likesRepository
      .createQueryBuilder("likes")
      .select([
        'likes',
      ])
      .where({
        user: user.id,
        record: recordId,
        isLike: true,
      })
      .getOne();
    if (existingLike) {
      throw new BadRequestException("already appreciate");
    }

    if (record.user.id != user.id) {
      const touser = await this.usersRepository.findOne({ where: { id: record.user.id } });
      await this.usersService.addScore(user, 1);
      await this.notificationService.sendNotification(user, touser, record, null, null, NotificationTypeEnum.LIKE_RECORD);
    }

    await this.recordsRepository.createQueryBuilder().update("records").set({ likesCount: record.likesCount + 1 }).where({ id: record.id }).execute();

    let usersId = [];
    usersId.push(record.user.id);
    if (record.likesCount + 1 == 10 || record.likesCount + 1 == 25 || record.likesCount + 1 == 50 || record.likesCount + 1 == 100) {
      let description = {
        eg: `INCREDIBLE 😲, your story has hit over ${record.likesCount + 1} likes!`,
        fr: `INCROYABLE 😲, ton histoire a reçu plus de ${record.likesCount + 1} j'aime!`
      }
      // this.mailService.sentNotifyToUser(usersId, description, { nav: "VoiceProfile", params: { id: record.id } });
      this.mailService.sentNotifyToUser(usersId, description, { nav: "Notification", params: {} });
    }
    if (record.likesCount < 5) {
      const fromUser = await this.usersRepository.findOne({ where: { id: user.id } });
      let description = {
        eg: `${fromUser.name} has liked your story`,
        fr: `${fromUser.name} a aimé ton histoire`
      }
      // this.mailService.sentNotifyToUser(usersId, description, { nav: "VoiceProfile", params: { id: record.id } });
      this.mailService.sentNotifyToUser(usersId, description, { nav: "Notification", params: {} });
    }

    const existing = await this.likesRepository
      .createQueryBuilder("likes")
      .select([
        'likes',
      ])
      .where({
        user: user.id,
        record: recordId,
      })
      .getOne();

    if (!existing) {
      const like = new LikesEntity();
      like.user = await this.usersRepository.findOne({ where: { id: user.id } });
      like.record = record;
      like.type = LikeTypeEnum.RECORD;
      like.emoji = ""; // body.emoji;
      await this.likesRepository
        .createQueryBuilder()
        .insert()
        .into(LikesEntity)
        .values(like)
        .execute();
      return like;
    }
    else {
      return await this.likesRepository.update(existing.id, { isLike: true });
    }
  }

  async reactionRecord(user, recordId, body) {
    const record = await this.recordsRepository.createQueryBuilder("record")
      .leftJoin('record.user', 'user')
      .where({ id: recordId })
      .select(["record.id", "record.reactionsCount", "user.id"])
      .getOne();
    if (!record || record.user.id == user.id) {
      throw new NotFoundException();
    }

    let addcount = 1;
    const existingReaction = await this.reactionsRepository
      .createQueryBuilder("reactions")
      .select([
        'reactions',
      ])
      .where({
        user: user.id,
        record: recordId,
      })
      .getOne();
    if (existingReaction) {
      this.reactionsRepository.remove(existingReaction);
      addcount = 0;
    }

    // if (record.user.id != user.id) {
    //   const touser = await this.usersRepository.findOne({ where: { id: record.user.id } });
    //   this.notificationService.sendNotification(user, touser, record, null, null, NotificationTypeEnum.LIKE_RECORD);
    // }

    const reaction = new ReactionsEntity();
    reaction.user = await this.usersRepository.findOne({ where: { id: user.id } });
    reaction.record = record;
    reaction.emoji = body.emoji;
    await this.recordsRepository.createQueryBuilder().update("records").set({ reactionsCount: record.reactionsCount + addcount }).where({ id: record.id }).execute();

    await this.reactionsRepository
      .createQueryBuilder()
      .insert()
      .into(ReactionsEntity)
      .values(reaction)
      .execute();

    const recordreactions = await this.getReactionsByIds([recordId]);
    const findReactions = filter(recordreactions, (obj) => obj.record.id === recordId);
    if (findReactions.length == 1) {
      let usersId = [];
      usersId.push(record.user.id);
      let description = {
        eg: `${reaction.user.name} reacted to your story! 👀`,
        fr: `${reaction.user.name} a réagi à ton histoire ! 👀`
      }
      this.mailService.sentNotifyToUser(usersId, description, { nav: "UserProfile", params: { userId: user.id } });
    }
    const payload: any = {
      last: 'OK',
    };
    return {
      lastreactions: findReactions && findReactions.length > 3 ? findReactions.slice(0, 3) : (findReactions ? findReactions : []),
      reactioncount: findReactions && findReactions.length > 0 ? findReactions.length : 0
    }
    // return reaction;
  }

  getReactionsByIds(ids): Promise<ReactionsEntity[]> {
    return this.reactionsRepository
      .createQueryBuilder("reactions")
      .innerJoin("reactions.record", "record", "record.id in (:...ids)", { ids })
      .leftJoin("reactions.user", "user")
      .select([
        "reactions.id",
        "reactions.emoji",
        "user.id",
        "record.id"
      ])
      .orderBy("reactions.createdAt", "DESC")
      .getMany();
  }

  async unLikeRecord(userId, recordId: string) {
    const record = await this.recordsRepository.findOne({ where: { id: recordId } });
    if (!record) {
      throw new NotFoundException("record not found");
    }

    const existingLike = await this.likesRepository
      .createQueryBuilder("likes")
      .select([
        'likes',
      ])
      .where({
        user: userId,
        record: recordId,
        isLike: true,
      })
      .getOne();
    if (!existingLike) {
      throw new BadRequestException("like not found");
    }
    if (record.likesCount > 0)
      await this.recordsRepository.update(record.id, { likesCount: record.likesCount - 1 });
    return await this.likesRepository.update(existingLike.id, { isLike: false });
  }

  async likeAnswer(user, answerId, receiverId) {
    const answer = await this.answersRepository.createQueryBuilder("answer")
      .leftJoin('answer.user', 'user')
      .leftJoin('answer.record', 'record')
      .where({ id: answerId })
      .select(["answer.id", "answer.likesCount", "user.id", "record.id"])
      .getOne();
    if (!answer) {
      throw new NotFoundException("answer not found");
    }
    const existingLike = await this.likesRepository
      .createQueryBuilder("likes")
      .select([
        'likes',
      ])
      .where({
        user: user.id,
        answer: answerId,
        isLike: true,
      })
      .getOne();
    if (existingLike) {
      throw new BadRequestException("already appreciate");
    }
    if (answer.user.id != user.id) {
      const touser = await this.usersRepository.findOne({ where: { id: answer.user.id } });
      await this.usersService.addScore(user, 1);
      await this.notificationService.sendNotification(user, touser, answer.record, answer, null, NotificationTypeEnum.LIKE_ANSWER);
    }

    await this.answersRepository.createQueryBuilder().update("answers").set({ likesCount: answer.likesCount + 1 }).where({ id: answer.id }).execute();

    const existing = await this.likesRepository
      .createQueryBuilder("likes")
      .select([
        'likes',
      ])
      .where({
        user: user.id,
        answer: answerId,
      })
      .getOne();

    await this.mailService.sentNotifyToAnswerLikedUser(user.id, receiverId);

    if (existing) {
      return this.likesRepository.update(existing.id, { isLike: true });
    }
    else {
      const like = new LikesEntity();
      like.user = await this.usersRepository.findOne({ where: { id: user.id } });
      like.answer = answer;
      like.type = LikeTypeEnum.ANSWER;
      await this.likesRepository
        .createQueryBuilder()
        .insert()
        .into(LikesEntity)
        .values(like)
        .execute();
      return like;
    }
  }

  async unLikeAnswer(userId, answerId: string) {
    const answer = await this.answersRepository.findOne({ where: { id: answerId } });
    if (!answer) {
      throw new NotFoundException("answer not found");
    }

    const existingLike = await this.likesRepository
      .createQueryBuilder("likes")
      .select([
        'likes',
      ])
      .where({
        user: userId,
        answer: answerId,
        isLike: true,
      })
      .getOne();
    if (!existingLike) {
      throw new BadRequestException("like not found");
    }
    if (answer.likesCount > 0)
      await this.answersRepository.update(answer.id, { likesCount: answer.likesCount - 1 });
    return await this.likesRepository.update(existingLike.id, { isLike: false });
  }

  async createBirdRoom(user, roomId) {
    // const findUsers = await this.findUsersByFriendId(user.id);
    // if (findUsers.length == 0)
    //   return;
    // const usersId = findUsers.map((user) => user.user.id);
    const findUser = await this.usersRepository.findOne({ where: { id: user.id } });
    let description = {
      eg: `${findUser.name} has created a live room, join now ! 👀`,
      fr: `${findUser.name} criou uma sala ao vivo, entre agora ! 👀`
    }
    await this.mailService.sentNotifyToUsers(description, { nav: "Home", params: { roomId } });
  }

  async createChatRoom(user, roomId) {
    // const findUsers = await this.findUsersByFriendId(user.id);
    // if (findUsers.length == 0)
    //   return;
    // const usersId = findUsers.map((user) => user.user.id);
    console.log("0");
    const findUser = await this.usersRepository.findOne({ where: { id: user.id } });
    let description = {
      eg: `${findUser.name} has created a chat room, join now ! 👀`,
      fr: `${findUser.name} criou uma sala ao vivo, entre agora ! 👀`
    }
    await this.mailService.sentNotifyToUsers(description, { nav: "Home", params: { chatRoomId: roomId } });
  }

  async enterBirdRoom(user, roomId) {
    const findUsers = await this.findUsersByFriendId(user.id);
    if (findUsers.length == 0)
      return;
    const usersId = findUsers.map((user) => user.user.id);
    const findUser = await this.usersRepository.findOne({ where: { id: user.id } });
    let description = {
      eg: `Your friend ${findUser.name} has joined a live room! Join too! 👀`,
      fr: `Sua amiga ${findUser.name} entrou em uma sala ao vivo! Participe também! 👀`
    }
    await this.mailService.sentNotifyToUser(usersId, description, { nav: "Home", params: { isFeed: true, roomId } });
  }

  async likeTag(user, tagId, isLike) {
    const tag = await this.tagsRepository.createQueryBuilder("tag")
      .leftJoin('tag.user', 'user')
      .where({ id: tagId })
      .select(["tag.id", "tag.likesCount", "user.id"])
      .getOne();
    if (!tag) {
      throw new NotFoundException("tag not found");
    }
    const existingLike = await this.likesRepository
      .createQueryBuilder("likes")
      .select([
        'likes',
      ])
      .where({
        user: user.id,
        tagFriend: tagId
      })
      .getOne();
    if (isLike == 'true') {
      if (existingLike) {
        if (existingLike.isLike == true) {
          throw new BadRequestException("already appreciate");
        }
        return this.likesRepository.update(existingLike.id, { isLike: true });
      }
      else {
        const like = new LikesEntity();
        like.user = user;
        like.tagFriend = tag;
        like.type = LikeTypeEnum.TAG_FRIEND;
        await this.likesRepository
          .createQueryBuilder()
          .insert()
          .into(LikesEntity)
          .values(like)
          .execute();
        return like;
      }
    }
    else {
      if (existingLike) {
        if (existingLike.isLike == false) {
          throw new BadRequestException("already unAppreciate");
        }
        return this.likesRepository.update(existingLike.id, { isLike: false });
      }
      else {
        throw new BadRequestException("already unAppreciate");
      }
    }
  }

  async likeReplyAnswer(userId: string, replyAnswerId) {
    const replyAnswer = await this.replyAnswersRepository.createQueryBuilder("replyAnswer")
      .leftJoin('replyAnswer.user', 'user')
      .leftJoin('replyAnswer.answer', 'answer')
      .where({ id: replyAnswerId })
      .select(["replyAnswer.id", "replyAnswer.likesCount", "user.id", "answer.id"])
      .getOne();
    if (!replyAnswer) {
      throw new NotFoundException("replyAnswer not found");
    }
    const existingLike = await this.likesRepository
      .createQueryBuilder("likes")
      .select([
        'likes',
      ])
      .where({
        user: userId,
        replyAnswer: replyAnswerId,
        isLike: true,
      })
      .getOne();
    if (existingLike) {
      throw new BadRequestException("already appreciate");
    }
    // if (replyAnswer.user.id != user.id) {
    //   const touser = await this.usersRepository.findOne({ where: { id: replyAnswer.user.id } });
    //   await this.notificationService.sendNotification(user, touser, replyAnswer.record, replyAnswer, null, NotificationTypeEnum.LIKE_ANSWER);
    // }
    await this.usersService.addScore({ id: userId }, 1);
    await this.replyAnswersRepository.update(replyAnswerId, { likesCount: replyAnswer.likesCount + 1 });

    const existing = await this.likesRepository
      .createQueryBuilder("likes")
      .select([
        'likes',
      ])
      .where({
        user: userId,
        replyAnswer: replyAnswerId
      })
      .getOne();
    if (existing) {
      return this.likesRepository.update(existing.id, { isLike: true });
    }
    else {
      const like = new LikesEntity();
      like.user = await this.usersRepository.findOne({ where: { id: userId } });
      like.replyAnswer = replyAnswer;
      like.type = LikeTypeEnum.REPLY_ANSWER;
      await this.likesRepository
        .createQueryBuilder()
        .insert()
        .into(LikesEntity)
        .values(like)
        .execute();
      return like;
    }
  }

  async unLikeReplyAnswer(userId, replyAnswerId: string) {
    const replyAnswer = await this.replyAnswersRepository.findOne({ where: { id: replyAnswerId } });
    if (!replyAnswer) {
      throw new NotFoundException("answer not found");
    }

    const existingLike = await this.likesRepository
      .createQueryBuilder("likes")
      .select([
        'likes',
      ])
      .where({
        user: userId,
        replyAnswer: replyAnswerId,
        isLike: true,
      })
      .getOne();
    if (!existingLike) {
      throw new BadRequestException("like not found");
    }
    if (replyAnswer.likesCount > 0)
      await this.replyAnswersRepository.update(replyAnswer.id, { likesCount: replyAnswer.likesCount - 1 });
    return await this.likesRepository.update(existingLike.id, { isLike: false });
  }

  async acceptFriend(user, friendId, requestId) {
    const findFriend = await this.usersRepository.findOne({ where: { id: friendId } });
    const findUser = await this.usersRepository.findOne({ where: { id: user.id } });
    if (!findFriend) {
      throw new NotFoundException();
    }
    const existFriend = await this.friendsRepository
      .createQueryBuilder("friends")
      .select([
        'friends',
      ])
      .where({
        user: friendId,
        friend: user.id
      })
      .getOne();
    if (!existFriend) {
      // throw new BadRequestException("user already friend");
      throw new NotFoundException();
    }

    if (existFriend.status == FriendsStatusEnum.ACCEPTED) {
      throw new BadRequestException("user already friend");
    }
    // const entity = new FriendsEntity();
    // entity.user = userId;
    // entity.friend = findFriend;
    // entity.status = FriendsStatusEnum.ACCEPTED; //todo add notification service
    existFriend.status = FriendsStatusEnum.ACCEPTED; //todo add notification service
    const rewardFriend = await this.friendsRepository
      .createQueryBuilder("friends")
      .select([
        'friends',
      ])
      .where({
        user: user.id,
        friend: friendId
      })
      .getOne();
    if (rewardFriend) {
      await this.friendsRepository.update(rewardFriend.id, { status: FriendsStatusEnum.ACCEPTED });
    }
    else {
      const entity = new FriendsEntity();
      entity.user = user.id;
      entity.friend = friendId;
      entity.status = FriendsStatusEnum.ACCEPTED; //todo add notification service
      await this.friendsRepository.save(entity);
    }
    await this.notificationService.sendNotification(user, findFriend, null, null, null, NotificationTypeEnum.FRIEND_ACCEPT);
    //await this.notificationService.deleteNotification(user, requestId);
    let usersId = [];
    usersId.push(findFriend.id);
    let description = {
      eg: `${findUser.name} has accepted your friend request ✨`,
      fr: `${findUser.name} a accepté ta demande d'ami ✨`
    }
    this.mailService.sentNotifyToUser(usersId, description, { nav: "UserProfile", params: { userId: user.id } });
    return await this.friendsRepository.save(existFriend);
  }

  async removeFriend(userId, friendId) {
    const findFriend = await this.usersRepository.findOne({ where: { id: friendId } });
    if (!findFriend) {
      throw new NotFoundException();
    }
    const existFriend = await this.friendsRepository
      .createQueryBuilder("friends")
      .select([
        'friends',
      ])
      .where({ user: userId, friend: friendId })
      .getOne();
    if (!existFriend) {
      throw new BadRequestException("user not you friend");
    }
    existFriend.status = FriendsStatusEnum.NONE;
    //this.notificationService.sendNotification(user, findFriend, null, null, null, NotificationTypeEnum.FRIEND_DELETE);
    return this.friendsRepository.save(existFriend);
  }

  async followFriend(user, friendId) {
    if (user.id == friendId) {
      throw new BadRequestException("error");
    }

    const findFriend = await this.usersRepository.findOne({ where: { id: friendId } });
    const findUser = await this.usersRepository.findOne({ where: { id: user.id } });
    if (!findFriend) {
      throw new NotFoundException();
    }
    const existFriend = await this.friendsRepository
      .createQueryBuilder("friends")
      .select([
        'friends',
      ])
      .where({ user: user.id, friend: friendId })
      .getOne();
    let savedEntity = null;
    if (existFriend) {
      if (existFriend.status == FriendsStatusEnum.ACCEPTED) {
        return existFriend;
      }
      if (findFriend.isPrivate)
        existFriend.status = FriendsStatusEnum.PENDING;
      else
        existFriend.status = FriendsStatusEnum.ACCEPTED;
      savedEntity = await this.friendsRepository.save(existFriend)
    }
    else {
      const entity = new FriendsEntity();
      entity.user = user.id;
      entity.friend = findFriend;
      if (findFriend.isPrivate)
        entity.status = FriendsStatusEnum.PENDING;
      else
        entity.status = FriendsStatusEnum.ACCEPTED;
      savedEntity = await this.friendsRepository.save(entity);
    }
    let usersId = [];
    usersId.push(findFriend.id);
    let description = {
      eg: `${findUser.name} has followed you 🤩`,
      fr: `${findUser.name} t'a suivi 🤩`
    }
    if (findFriend.isPrivate) {
      description = {
        eg: `${findUser.name} wants to be your friend 🤩`,
        fr: `${findUser.name} veut être ton ami 🤩`
      }
      this.mailService.sentNotifyToUser(usersId, description, { nav: "Notification", params: { isRequest: true } });
    }
    else
      this.mailService.sentNotifyToUser(usersId, description, { nav: "UserProfile", params: { userId: findUser.id } });
    const towardFriend = await this.friendsRepository
      .createQueryBuilder("friends")
      .select([
        'friends',
      ])
      .where({ user: friendId, friend: user.id })
      .getOne();
    let towardEntity = null;
    if (towardFriend) {
      towardEntity = towardFriend;
    }
    else {
      const entity = new FriendsEntity();
      entity.user = friendId;
      entity.friend = user.id;
      entity.status = FriendsStatusEnum.NONE; //todo add notification service
      towardEntity = await this.friendsRepository.save(entity);
    }
    let des = NotificationTypeEnum.USER_FOLLOW;
    if (findFriend.isPrivate)
      des = NotificationTypeEnum.FRIEND_REQUEST;
    this.notificationService.sendNotification(user, findFriend, null, null, savedEntity, des, towardEntity);
    return savedEntity;
  }

  async deleteSuggest(user, friendId) {
    if (user.id == friendId) {
      throw new BadRequestException("error");
    }

    const findFriend = await this.usersRepository.findOne({ where: { id: friendId } });
    if (!findFriend) {
      throw new NotFoundException();
    }
    const existFriend = await this.friendsRepository
      .createQueryBuilder("friends")
      .select([
        'friends',
      ])
      .where({
        user: user.id,
        friend: friendId
      })
      .getOne();
    let savedentity;
    if (existFriend) {
      existFriend.suggest = false;
      savedentity = await this.friendsRepository.save(existFriend)
    }
    else {
      const entity = new FriendsEntity();
      entity.user = user.id;
      entity.friend = findFriend;
      entity.suggest = false; //todo add notification service
      savedentity = await this.friendsRepository.save(entity);
    }
    return savedentity;
  }

  async inviteFriend(user, phoneNumber, forSend) {
    if (user.phoneNumber == phoneNumber) {
      throw new BadRequestException("error");
    }
    if (forSend) {
      const findUser = await this.usersRepository.findOne({ where: { id: user.id } });
      let content = '';
      if (findUser.country == 'Brazil')
        content = "Conecte-se com Deus e outros cristãos do Brasil na aplicação Vodeus. É gratuito! www.vodeus.co";
      else
        content = "Connect with God and other Christians from Brazil on Vodeus app. It's free! www.vodeus.co";
      this.twilioClient.messages
        .create({
          body: content,
          messagingServiceSid: 'MGc4391c4cc4b1e73bcf44682b5ea20e1a',
          to: phoneNumber
        })
        .then(message => console.log(message.sid));
    }
    await this.usersService.addScore(user, 10);
    return 0;
  }

  async blockUser(user, friendId) {
    if (user.id == friendId) {
      throw new BadRequestException("error");
    }

    const findFriend = await this.usersRepository.findOne({ where: { id: friendId } });
    if (!findFriend) {
      throw new NotFoundException();
    }
    const existFriend = await this.friendsRepository
      .createQueryBuilder("friends")
      .select([
        'friends',
      ])
      .where({
        user: user.id,
        friend: friendId
      })
      .getOne();
    let savedentity;
    if (existFriend) {
      existFriend.status = FriendsStatusEnum.BLOCKED;
      savedentity = await this.friendsRepository.save(existFriend);
    }
    else {
      const entity = new FriendsEntity();
      entity.user = user.id;
      entity.friend = findFriend;
      entity.status = FriendsStatusEnum.BLOCKED; //todo add notification service
      savedentity = await this.friendsRepository.save(entity);
    }
    // const reverse = await this.friendsRepository
    //   .createQueryBuilder("friends")
    //   .select([
    //     'friends',
    //   ])
    //   .where({
    //     user: friendId,
    //     friend: user.id
    //   })
    //   .getOne();
    // if (reverse) {
    //   existFriend.status = FriendsStatusEnum.BLOCKED;
    //   await this.friendsRepository.save(existFriend);
    // }
    // else {
    //   const entity = new FriendsEntity();
    //   entity.user = findFriend;
    //   entity.friend = user.id;
    //   entity.status = FriendsStatusEnum.BLOCKED; //todo add notification service
    //   await this.friendsRepository.save(entity);
    // }
    //this.notificationService.sendNotification(user, findFriend, null, null, savedentity, NotificationTypeEnum.USER_BLOCK);
    return savedentity;
  }

  async getAllCountries() {
    return this.countriesRepository.find();
  }

  async removeRecord(userId, recordId) {
    const findRecord = await this.recordsRepository
      .createQueryBuilder("records")
      .select([
        'records',
      ])
      .where({
        id: recordId,
        user: userId
      })
      .getOne();
    if (!findRecord) {
      throw new NotFoundException();
    }

    return await this.recordsRepository.delete(findRecord.id);
  }

  async createReport(user, type, target, record, answer) {
    const targetUser = await this.usersRepository.findOne({ where: { id: target } });
    if (!targetUser) {
      throw new NotFoundException();
    }

    const report = new ReportsEntity();
    report.reporter = user;
    report.type = <ReportTypeEnum>type;
    report.target = targetUser;

    if (record) {
      const reportRecord = await this.recordsRepository.findOne({ where: { id: record } });
      if (!reportRecord) {
        throw new NotFoundException("record not found");
      }

      report.record = reportRecord;
    }

    if (answer) {
      const reportAnswer = await this.answersRepository.findOne({ where: { id: answer } });
      if (!reportAnswer) {
        throw new NotFoundException("answer not found");
      }

      report.answer = reportAnswer;
    }

    return await this.reportsRepository.save(report);
  }

  async shareLink(user) {
    this.usersService.addHistory(user.id, HistoryTypeEnum.SHARE_LINK);
    await this.usersRepository.update(user.id, { shareLinkCount: () => '"shareLinkCount" + 1' });
  }
}
