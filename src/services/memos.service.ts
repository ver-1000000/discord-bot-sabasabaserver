import { Client, Message } from 'discord.js';

import { PrettyText } from 'src/lib/pretty-text';
import { DISCORD_PRESENCE_NAME } from 'src/environment';
import { MemosStore } from 'src/stores/memos.store';

/** メッセージ(`content`)からコマンドに該当する文字列を除外する。 */
const trimCommandsForConent = (content: string) => content.replace(/!memo\.?\w*\s*\n*/, '').trim();

/** `GenerateText.help`に食わせるヘルプ文の定数。 */
const HELP = {
  DESC: `\`!memo\` コマンドは、**${DISCORD_PRESENCE_NAME}**にメモを記録させるためのコマンドです。`,
  ITEMS: [
    ['!memo.get hoge', '`"hoge"`の値を取得します'],
    ['!memo.set hoge foo', '`"hoge"` に値として `"foo"` を設定します(値はマークダウンや改行が可能)'],
    ['!memo.remove hoge', '設定済の `"hoge"` の値を削除します'],
    ['!memo.list', 'メモされた値をすべて表示します'],
    ['!memo.help', '`!memo` コマンドのヘルプを表示します(エイリアス: `!memo`)'],
  ]
} as const;

/** `MemosStore`の値を操作するサービスクラス。 */
export class MemosService {
  constructor(private client: Client, private memosStore: MemosStore) {}

  /** Clientからのイベント監視を開始する。 */
  run() {
    this.client.on('message', message => this.onMessage(message));
    return this;
  }

  /** `mesage`で関数を振り分けるファサード。 */
  private onMessage(message: Message) {
    const content = message.content;
    if (message.author.bot) { return; } // botの発言は無視
    if (content.startsWith('!memo.get')) { this.get(message); };
    if (content.startsWith('!memo.set')) { this.set(message); };
    if (content.startsWith('!memo.remove')) { this.remove(message); };
    if (content.startsWith('!memo.list')) { this.list(message); };
    if (content.startsWith('!memo.help') || content === '!memo') { this.help(message); };
  }

  /** keyにマッチする値を取得する。 */
  private get({ author, channel, content }: Message) {
    const key = trimCommandsForConent(content);
    channel.send(`${author} ${this.memosStore.get(key).pretty}`);
  }

  /**
   * bodyの最初の空白(もしくは改行)で前半部と後半部を分け、
   * 前半部をキーに、後半部を値にしたものをmemoとして登録する。
   */
  private set({ author, channel, content }: Message) {
    const body  = trimCommandsForConent(content);
    const key   = body.replace(/\s.*/g, '');
    const value = body.replace(key, '').trim();
    channel.send(`${author} ${this.memosStore.set(key, value).pretty}`);
  }

  /** bodyにマッチする値を削除する。 */
  private remove({ author, channel, content }: Message) {
    const body  = trimCommandsForConent(content);
    channel.send(`${author} ${this.memosStore.del(body).pretty}`);
  }

  /** memoの値を一覧する。 */
  private list({ channel }: Message) {
    channel.send(this.memosStore.data().pretty);
  }

  /** ヘルプを表示する。 */
  private help({ channel }: Message) {
    const text = PrettyText.helpList(HELP.DESC, ...HELP.ITEMS);
    channel.send(text);
  }
}
