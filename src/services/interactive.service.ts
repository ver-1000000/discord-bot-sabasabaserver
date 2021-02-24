import { promises as fs } from 'fs';
import { Client, Message } from 'discord.js';

/** BOTがメンションを受けた取ったときの対話挙動を定義するサービスクラス。 */
export class InteractiveService {
  constructor(private client: Client) {}

  /** Clientからのイベント監視を開始する。 */
  run() {
    this.client.on('message', message => this.onMessage(message));
  }

  /** Messageから各処理を呼び出すFacade関数。 */
  private onMessage(message: Message) {
    if (message.author.bot) { return; } // botの発言は無視
    if (message.mentions.has(this.client.user || '')) { this.reply(message); };
  }

  /** リプライを受け取ったメンバーに対して、README.mdの内容をパースした概要を通知発言する。 */
  async reply({ author, channel }: Message) {
    const md          = await fs.readFile('README.md', 'utf-8');
    const section     = (token: string) => md.match(new RegExp(`${token}[\\s\\S]*?(#|$)`))?.[0].replace(/#$/, '').trim();
    const description = section('# discord-bot-sabasabaserver');
    const feature     = section('## 機能');
    const text        = '```md\n' + [description, feature].join('\n\n') + '\n```';
    channel.send(`${author}\n${text}`);
  }
}
