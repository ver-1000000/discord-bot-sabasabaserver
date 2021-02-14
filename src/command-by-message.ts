import { Message } from 'discord.js';

/** ヘルプ時に表示するヒアドキュメント。 */
const HELP_TEXT = `
_**\`!memo.set hoge foo         \`**_ - "hoge"に"foo"を設定します
_**\`!memo.get hoge             \`**_ - "hoge"の値を取得します
_**\`!memo.merge {"hoge":"foo"} \`**_ - json形式のkey-valueをparseしてそのまま登録します
_**\`!memo.remove hoge          \`**_ - 設定済の"hoge"の値を削除します
_**\`!memo.list                 \`**_ - メモされた値をすべて表示します
_**\`!memo.help                 \`**_ - !memoコマンドのヘルプを表示します
`;

/** Messageを解析してコマンドを判定し、コマンドごとに処理を行うクラス。 */
export class CommandByMessage {
  /** メモの内容を保存するための簡易ストア。 */
  private storage = {
    store: {} as Record<string, string>,
    setItem: (key: string, value: string) => this.storage.store[key] = value,
    getItem: (key: string) => this.storage.store[key],
    showall: () => Object.entries(this.storage.store).map(([k, v]) => `**${k}**\n ${v}`).join('\n') || 'メモはひとつも設定されていません',
    removeItem: (key: string) => delete this.storage.store[key]
  };

  constructor() {}

  /** Messageから各処理を呼び出すFacade関数。 */
  run(message: Message) {
    const content   = message.content;
    const body      = content.replace(/!memo\.?\w*\s*/, '').trim(); // コマンド以外のテキスト部分
    const isCommand = (command: string) => content.startsWith(`!memo.${command}`);
    if (message.author.bot) { return; } // botの発言は無視
    if (!content.startsWith('!memo')) { return; } // `!memo`コマンド以外を受け取ったときはそのまま終了
    if (isCommand('help') || content === '!memo') { this.commandHelp(message); };
    if (isCommand('set')) { this.commandSet(message, { body }); };
    if (isCommand('remove')) { this.commandRemove(message, { body }); };
    if (isCommand('get')) { this.commandGet(message, { body }); };
    if (isCommand('list')) { this.commandList(message); };
    if (isCommand('merge')) { this.commandMerge(message, { body }); };
  }

  /** `!memo.help`/`!memo` コマンドを受け取った時、ヘルプを表示する。 */
  private commandHelp({ channel }: Message) {
    channel.send(HELP_TEXT);
  }

  /** `!memo.set` コマンドを受け取った時、第一引数をキーに、第二引数を値にしたものを登録する。 */
  private commandSet(message: Message, { body }: { body: string }) {
    const key   = body.replace(/\s.*/, '');
    const value = body.replace(key, '').trim();
    this.storage.setItem(key, value);
    message.reply(`{ "${key}": "${value}" }を設定しました:wink:`);
  }

  /** `!memo.remove` コマンドを受け取った時、第一引数にマッチする値を削除する。 */
  private commandRemove(message: Message, { body }: { body: string }) {
    if (this.storage.getItem(body)) {
      this.storage.removeItem(body);
      message.reply(`*"${body}"* を削除しました`);
    } else {
      message.reply(`*"${body}"* は設定されていません`);
    }
  }

  /** `!memo.get` コマンドを受け取った時、第一引数にマッチする値を取得する。 */
  private commandGet(message: Message, { body }: { body: string }) {
    const value = this.storage.getItem(body);
    message.reply(value == null ? `*"${body}"* は設定されていません` : `*"${body}"* は *"${value}"*`);
  }

  /** `!memo.list` コマンドを受け取った時、値を一覧する。 */
  private commandList({ channel }: Message) {
    channel.send(this.storage.showall());
  }

  /** `!memo.merge` コマンドを受け取った時、文字列をjsonにパースしてマージする。 */
  private commandMerge({ channel, reply }: Message, { body }: { body: string }) {
    try {
      const parsed = JSON.parse(body);
      Object.entries(parsed).forEach(([k, v]) => this.storage.setItem(k, JSON.stringify(v)));
      channel.send(this.storage.showall());
    } catch (e) {
      reply('jsonの形式がおかしいよ:rage:');
    }
  }
}
