import { Message } from 'discord.js';
import { MemosStore } from './memos.store';

/** ヘルプ時に表示するヒアドキュメント。 */
const HELP_TEXT = `
_**\`!memo.get hoge     \`**_ - \`"hoge"\` の値を取得します
_**\`!memo.set hoge foo \`**_ - \`"hoge"\` に値として \`"foo"\` を設定します(値はマークダウンや改行が可能)
_**\`!memo.remove hoge  \`**_ - 設定済の"hoge"の値を削除します
_**\`!memo.list         \`**_ - メモされた値をすべて表示します
_**\`!memo.help         \`**_ - \`!memo\` コマンドのヘルプを表示します(エイリアス: \`!memo\`)
`;

/**
 * Messageを解析してコマンドを判定し、コマンドごとに処理を行うクラス。
 * Facadeの役割を持ち、ロジックの具体的な実装は他のクラスで行う。
 */
export class CommandsFacade {
  private memosStore = new MemosStore();

  constructor() {}

  /** Messageから各処理を呼び出すFacade関数。 */
  run(message: Message) {
    const content   = message.content;
    const body      = content.replace(/!memo\.?\w*\s*\n*/, '').trim(); // コマンド以外のテキスト部分
    const isCommand = (command: string) => content.startsWith(`!memo.${command}`);
    if (message.author.bot) { return; } // botの発言は無視
    if (!content.startsWith('!memo')) { return; } // `!memo`コマンド以外を受け取ったときはそのまま終了
    if (isCommand('get')) { this.commandGet(message, { body }); };
    if (isCommand('set')) { this.commandSet(message, { body }); };
    if (isCommand('remove')) { this.commandRemove(message, { body }); };
    if (isCommand('list')) { this.commandList(message); };
    if (isCommand('help') || content === '!memo') { this.commandHelp(message); };
  }

  /** `!memo.get` コマンドを受け取った時、第一引数にマッチする値を取得する。 */
  private commandGet({ channel, author }: Message, { body: key }: { body: string }) {
    channel.send(`${author} ${this.memosStore.get(key).pretty}`);
  }

  /** `!memo.set` コマンドを受け取った時、第一引数をキーに、第二引数を値にしたものを登録する。 */
  private commandSet({ channel, author }: Message, { body }: { body: string }) {
    const key   = body.replace(/\s.*/g, '');
    const value = body.replace(key, '').trim();
    channel.send(`${author} ${this.memosStore.set(key, value).pretty}`);
  }

  /** `!memo.remove` コマンドを受け取った時、第一引数にマッチする値を削除する。 */
  private commandRemove({ channel, author }: Message, { body }: { body: string }) {
    channel.send(`${author} ${this.memosStore.del(body).pretty}`);
  }

  /** `!memo.list` コマンドを受け取った時、値を一覧する。 */
  private commandList({ channel }: Message) {
    channel.send(this.memosStore.data().pretty);
  }

  /** `!memo.help`/`!memo` コマンドを受け取った時、ヘルプを表示する。 */
  private commandHelp({ channel }: Message) {
    channel.send(HELP_TEXT);
  }
}
