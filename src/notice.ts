import { Injectable, Logger } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { MailsService } from './mail/mail.service';
import { CronJob } from 'cron';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private mailService: MailsService,
    private schedulerRegistry: SchedulerRegistry
  ){
  }

  // @Cron('0 16 */2 * *')
  // async anythingHappen() {
  //   this.logger.debug('Called at 6 pm every 2 days');
  //   let description = {
  //     eg:"Anything happened to you today? Say it! 👀",
  //     fr:"Il vous est arrivé quelque chose aujourd'hui ? Dites-le ! 👀"
  //   }
  //   await this.mailService.sentNotifyToUsers(description,{nav:"Notification",params:{}});
  // }

  @Cron('0 16 * * *')
  async shareStory() {
    this.logger.debug('Called at 6 pm every 2 days');
    let description = {
      eg:"⚡It’s time to share your story⚡",
      fr:"⚡Il est temps de partager ton histoire !⚡"
    }
    await this.mailService.sentNotifyToUsers(description,{nav:"Home",params:{popUp:true}});
  }

  @Cron('30 10 * * *')
  async answerThem() {
    // this.logger.debug('Called at 12.30 pm every day');
    // let description = {
      // eg:"You have answers, answer them!  😈",
      // fr:"Vous avez des réponses, répondez-leurs ! 😈"
    // }
    // await this.mailService.sentNotifyToUsersHaveAnswer(description,{nav:"Notification",params:{}});
  }
}