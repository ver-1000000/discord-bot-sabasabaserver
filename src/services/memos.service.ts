import { Message } from 'discord.js';

import generateHelpText from 'src/helpers/generate-help-text';
import { DISCORD_PRESENCE_NAME } from 'src/environment';
import { MemosStore } from 'src/stores/memos.store';

/** メッセージ(`content`)からコマンドに該当する文字列を除外する。 */
const trimCommandsForConent = (content: string) => content.replace(/!memo\.?\w*\s*\n*/, '').trim();

/** `MemosStore`の値を操作するサービスクラス。 */
export class MemosService {
  private memosStore = new MemosStore();

  constructor() {}

  /** keyにマッチする値を取得する。 */
  get({ author, channel, content }: Message) {
    const key = trimCommandsForConent(content);
    channel.send(`${author} ${this.memosStore.get(key).pretty}`);
  }

  /**
   * bodyの最初の空白(もしくは改行)で前半部と後半部を分け、
   * 前半部をキーに、後半部を値にしたものをmemoとして登録する。
   */
  set({ author, channel, content }: Message) {
    const body  = trimCommandsForConent(content);
    const key   = body.replace(/\s.*/g, '');
    const value = body.replace(key, '').trim();
    channel.send(`${author} ${this.memosStore.set(key, value).pretty}`);
  }

  /** bodyにマッチする値を削除する。 */
  remove({ author, channel, content }: Message) {
    const body  = trimCommandsForConent(content);
    channel.send(`${author} ${this.memosStore.del(body).pretty}`);
  }

  /** memoの値を一覧する。 */
  list({ channel }: Message) {
    channel.send(this.memosStore.data().pretty);
  }

  /** ヘルプを表示する。 */
  help({ channel }: Message) {
    const text = generateHelpText(
      `\`!memo\` コマンドは、**${DISCORD_PRESENCE_NAME}**にメモを記録させるためのコマンドです。`,
      ['!memo.get hoge', '`"hoge"`の値を取得します'],
      ['!memo.set hoge foo', '`"hoge"` に値として `"foo"` を設定します(値はマークダウンや改行が可能)'],
      ['!memo.remove hoge', '設定済の `"hoge"` の値を削除します'],
      ['!memo.list', 'メモされた値をすべて表示します'],
      ['!memo.help', '`!memo` コマンドのヘルプを表示します(エイリアス: `!memo`)'],
    );
    channel.send(text);
  }
}
