import { MailerService } from '@nestjs-modules/mailer';
import { UsersService } from "../users/users.service";
import { RecordsService } from 'src/records/records.service';
import { ConsoleLogger, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from 'nestjs-config';
import { notificationSettings } from './notificationConfig';
import * as PushNotifications from 'node-pushnotifications';
import * as admin from 'firebase-admin';

@Injectable()
export class MailsService {
    private logger = new Logger(MailsService.name);
    private push = new PushNotifications(notificationSettings);
    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly recordsService: RecordsService,
    ) {
    }

    public sentVerificationCode(code: string, email: string): any {
        return this
            .mailerService
            .sendMail({
                to: email,
                from: this.configService.get('app.smtp_mail'),
                subject: 'Welcome to Vodeus! Confirm your Email',
                template: './index', // './' bugfix, undocumented in docs
                context: { code },
            })
            .then((success) => {
                this.logger.log(success)
            })
            .catch((err) => {
                this.logger.error(err)
            });
    }

    public sendEmailToAdmin(type: string, user: string, email: string): any {
        return this
            .mailerService
            .sendMail({
                to: email,
                from: this.configService.get('app.smtp_mail'),
                subject: type === "subscribe" ? 'New User Is Registered' : "Premium User Is Registered!",
                template: './index', // './' bugfix, undocumented in docs
                context: { user },
            })
            .then((success) => {
                this.logger.log(success)
            })
            .catch((err) => {
                this.logger.error(err)
            });
    }

    // public sentNotify(registrationIds, description, params): any {
    //     let data = { title: 'Vocco', body: description, topic: 'org.vocco', custom: params, invokeApp: false };
    //     return this.push
    //         .send(registrationIds, data, (err, result) => {
    //             console.log(err);
    //         })
    // }

    public async sentNotify(registrationIds, description, params): Promise<string> {
        let data = { title: 'Hilal', body: description, topic: 'org.hilal', custom: params, invokeApp: false };
        this.push
            .send(registrationIds, data, (err, result) => {
                console.log(result,":result+++++++++++++++++++++++++");
            })
        try {
            console.log("0");
            const res = await admin.messaging().sendToDevice(registrationIds, {
                notification: { title: 'Hilal', body: description, icon:'https://vodienstorage.s3.sa-east-1.amazonaws.com/ic_launcher+(5).png' },
                data: params
            });
            console.log(res,"1");
            // return error message if any error create in fcm process
            if (res?.failureCount) {
                console.log(res.results?.[0]?.error?.message,"__________________________________");
            }
            // return error message if any error create in fcm process
            console.log(res.results?.[0]?.messageId,"---------------------------------------");
        } catch (error) {
            console.log(error,"final_error")
            return error;
        }
    }

    async sentNotifyToUsers(description, params) {
        const deviceTokens = await this.usersService.findDevices();
        this.sentNotify(deviceTokens.fr, description.fr, params);
        this.sentNotify(deviceTokens.eg, description.eg, params);
    }

    async sentNotifyToUser(usersId, description, params) {
        const deviceTokens = await this.usersService.findDevicesWithUser(usersId);
        this.sentNotify(deviceTokens.fr, description.fr, params);
        this.sentNotify(deviceTokens.eg, description.eg, params);
    }

    async sentNotifyToUsersHaveAnswer(description, params) {
        const deviceTokens = await this.usersService.findDevicesWithAnswer();
        this.sentNotify(deviceTokens.fr, description.fr, params);
        this.sentNotify(deviceTokens.eg, description.eg, params);
    }

    async sentNotifyToFriends(userId,recordId,createdAt) {
        const findUsers = await this.recordsService.findUsersByFriendId(userId);
        if (findUsers.length == 0)
            return;
        const usersId = findUsers.map((user) => user.user.id);
        const deviceTokens = await this.usersService.findDevicesWithUser(usersId);
        const sender = await this.usersService.findById(userId);

        this.sentNotify(deviceTokens.fr, `${sender.name} a posté une nouvelle histoire`, { nav: "Home", params: {targetRecordId:recordId,createdAt} });
        this.sentNotify(deviceTokens.eg, `${sender.name} has posted a new story`, { nav: "Home", params: {targetRecordId:recordId,createdAt} });
    }

    async sentNotifyToFriendsPastStory(userId,recordId,createdAt) {
        const findUsers = await this.recordsService.findUsersByFriendId(userId);
        if (findUsers.length == 0)
            return;
        
        const usersId = findUsers.map((user) => user.user.id);
        const deviceTokens = await this.usersService.findDevicesWithUser(usersId);
        const sender = await this.usersService.findById(userId);

        this.sentNotify(deviceTokens.fr, `${sender.name} a partagé un moment avec toi 🥺`, { nav: "Home", params: {targetRecordId:recordId,createdAt} });
        this.sentNotify(deviceTokens.eg, `${sender.name} has shared a great moment with you 🥺`, { nav: "Home", params: {targetRecordId:recordId,createdAt} });
    }

    async sentNotifyToStoryOwner(userId, receiverId,recordId, createdAt) {
        const deviceTokens = await this.usersService.findDevicesWithUser([receiverId]);
        const sender = await this.usersService.findById(userId);
        this.sentNotify(deviceTokens.fr, `${sender.name} a commenté ton histoire !`, { nav: "Home", params: {targetRecordId:recordId,createdAt} });
        this.sentNotify(deviceTokens.eg, `${sender.name} has commented your story`, { nav: "Home", params: {targetRecordId:recordId,createdAt} });
    }

    async sentNotifyToCommentedUser(userId, receiverId) {
        const deviceTokens = await this.usersService.findDevicesWithUser([receiverId]);
        const sender = await this.usersService.findById(userId);
        this.sentNotify(deviceTokens.fr, `${sender.name} t'a taggé dans un commentaire.`, { nav: "Notification", params: {} });
        this.sentNotify(deviceTokens.eg, `${sender.name} has tagged you in a comment`, { nav: "Notification", params: {} });
    }

    async sentNotifyToAnswerLikedUser(userId, receiverId) {
        const deviceTokens = await this.usersService.findDevicesWithUser([receiverId]);
        const sender = await this.usersService.findById(userId);
        this.sentNotify(deviceTokens.fr, `${sender.name} a aimé ton commentaire`, { nav: "Notification", params: {} });
        this.sentNotify(deviceTokens.eg, `${sender.name} has liked your comment`, { nav: "Notification", params: {} });
    }

    async sentNotifyToAnswerReplyUser(userId, receiverId) {
        const deviceTokens = await this.usersService.findDevicesWithUser([receiverId]);
        const sender = await this.usersService.findById(userId);
        this.sentNotify(deviceTokens.fr, `${sender.name} t'a répondu`, { nav: "Notification", params: {} });
        this.sentNotify(deviceTokens.eg, `${sender.name} has replied to you`, { nav: "Notification", params: {} });
    }


    public sentRecoverCode(code: string, email: string): any {
        return this
            .mailerService
            .sendMail({
                to: email,
                from: this.configService.get('app.smtp_mail'),
                subject: 'Hi',
                template: './index', // './' bugfix, undocumented in docs
                context: { code },
            })
            .then((success) => {
                this.logger.log(success)
            })
            .catch((err) => {
                this.logger.error(err)
            });
    }

}
