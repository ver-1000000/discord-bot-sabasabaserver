import { config } from 'dotenv';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Client, ClientUser, TextChannel, VoiceState } from 'discord.js';

import { CommandsFacade } from './commands.facade';

config();

/** 起点となるメインのアプリケーションクラス。 */
class App {
  constructor(private commands: CommandsFacade) {
  }

  /** アプリケーションクラスを起動する。 */
  run() {
    const client = new Client();
    this.confirmToken();
    this.launchWarmGlitch();
    client.on('ready', () => this.initializeBotStatus(client.user));
    client.on('voiceStateUpdate', (oldState, newState) => this.sendStartVoiceChannel(oldState, newState, client));
    client.on('message', message => this.commands.run(message));
    client.login(process.env.DISCORD_LOGIN_TOKEN);
  }

  /** DISCORD_LOGIN_TOKENが設定されていなければ異常終了させる。 */
  private confirmToken() {
    if (process.env.DISCORD_LOGIN_TOKEN) { return; }
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
    user?.setPresence({ activity: { name: process.env.DISCORD_PRESENCE_NAME || 'AWESOME BOT' } });
  }

  /** 音声チャンネルに最初の一人が入室したときに通知する。 */
  private sendStartVoiceChannel(oldState: VoiceState, newState: VoiceState, client: Client) {
    if (oldState.channelID == null && newState.channelID && newState.member && newState.channel && newState.channel.members.size === 1) {
      const notifyChannel = client.channels.cache.get(process.env.DISCORD_NOTIFY_CHANNEL_ID || '') as TextChannel | undefined;
      const text          = `:loudspeaker: **${newState.member}** が **${newState.channel.name}** でボイスチャンネルを開始しました`;
      notifyChannel?.send(text);
    }
  }
}
new App(new CommandsFacade()).run();
