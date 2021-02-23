import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Client, ClientUser } from 'discord.js';

import { DISCORD_LOGIN_TOKEN, DISCORD_PRESENCE_NAME } from 'src/environment';
import { NotifyVoiceChannelService } from 'src/services/notify-voice-channel.service';
import { CommandsFacade } from 'src/commands.facade';

/** 起点となるメインのアプリケーションクラス。 */
class App {
  constructor(private commands: CommandsFacade, private notify: NotifyVoiceChannelService) {}

  /** アプリケーションクラスを起動する。 */
  run() {
    const client = new Client();
    this.confirmToken();
    this.launchWarmGlitch();
    client.on('ready', () => this.initializeBotStatus(client.user));
    client.on('message', message => this.commands.run(message));
    client.on('voiceStateUpdate', (oldState, newState) => this.notify.run(oldState, newState, client));
    client.login(DISCORD_LOGIN_TOKEN);
  }

  /** DISCORD_LOGIN_TOKENが設定されていなければ異常終了させる。 */
  private confirmToken() {
    if (DISCORD_LOGIN_TOKEN) { return; }
    console.log('DISCORD_LOGIN_TOKENが設定されていません。');
    process.exit(1);
  }

  /** GLITCHのコールドスタート対策用のサービングを開始する。 */
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
  }
}
const commands = new CommandsFacade();
const notify   = new NotifyVoiceChannelService();
new App(commands, notify).run();
