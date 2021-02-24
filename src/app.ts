import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Client, ClientUser, TextChannel } from 'discord.js';

import { DISCORD_LOGIN_TOKEN, DISCORD_NOTIFY_TEXT_CHANNEL_ID, DISCORD_PRESENCE_NAME } from 'src/environment';
import { NotifyVoiceChannelService } from 'src/services/notify-voice-channel.service';
import { CommandsFacade } from 'src/commands.facade';
import { PomodoroService } from './services/pomodoro.service';

/** 起点となるメインのアプリケーションクラス。 */
class App {
  constructor(private client: Client) {}

  /** アプリケーションクラスを起動する。 */
  run() {
    this.confirmToken();
    this.launchWarmGlitch();
    this.client.on('ready', () => this.initializeBotStatus(this.client.user));
    this.client.on('error', e => this.error(e));
    this.client.login(DISCORD_LOGIN_TOKEN);
  }

  /** DISCORD_LOGIN_TOKENが設定されていなければ異常終了させる。 */
  private confirmToken() {
    if (DISCORD_LOGIN_TOKEN) { return; }
    console.log('DISCORD_LOGIN_TOKENが設定されていません。');
    process.exit(1);
  }

  /** Glitchのコールドスタート対策用のサービングを開始する。 */
  private launchWarmGlitch() {
    const whenPost = (req: IncomingMessage, res: ServerResponse) => {
      const chunks: string[] = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const data  = chunks.join();
        console.log(`requested: ${data}`);
        res.end();
      });
    };
    createServer((req, res) => {
      if (req.method == 'POST') { whenPost(req, res); }
    }).listen(3000);
  }

  /** readyイベントにフックして、ボットのステータスなどを設定する。 */
  private initializeBotStatus(user: ClientUser | null) {
    console.log('ready...');
    user?.setPresence({ activity: { name: DISCORD_PRESENCE_NAME || 'AWESOME BOT' } });
    this.send(`${DISCORD_PRESENCE_NAME} is ranning!`);
  }

  /** Discord.jsからエラーイベントを受け取った時、Discordに通知する。 */
  private error(e: Error) {
    this.send(`:skull_crossbones: エラー出タ、死んダかも……。 \`(${e.name})\``);
  }

  /** 通知チャンネルにメッセージを送信する。 */
  private send(msg: string) {
    this.client.on('ready', () => {
      const notifyChannel = this.client.channels.cache.get(DISCORD_NOTIFY_TEXT_CHANNEL_ID || '') as TextChannel | undefined;
      notifyChannel?.send(msg);
    });
  }
}

/** 依存を解決しつつアプリケーションを起動する。 */
(() => {
  const client   = new Client();
  const notify   = new NotifyVoiceChannelService(client);
  const pomodoro = new PomodoroService(client);
  const commands = new CommandsFacade(client, pomodoro);
  const app      = new App(client);
  notify.run();
  pomodoro.run();
  commands.run();
  app.run();
})();
