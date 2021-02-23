import { Message } from 'discord.js';

import { MemosService } from 'src/services/memos.service';

/**
 * Messageを解析してコマンドを判定し、コマンドごとに処理を行うクラス。
 * Facadeの役割を持ち、ロジックの具体的な実装は他のクラスで行う。
 */
export class CommandsFacade {
  private memos = new MemosService();

  constructor() {}

  /** Messageから各処理を呼び出すFacade関数。 */
  run(message: Message) {
    const content   = message.content;
    const isCommand = (command: string) => content.startsWith(command);
    if (message.author.bot) { return; } // botの発言は無視
    if (isCommand('!memo.get')) { this.memos.get(message); };
    if (isCommand('!memo.set')) { this.memos.set(message); };
    if (isCommand('!memo.remove')) { this.memos.remove(message); };
    if (isCommand('!memo.list')) { this.memos.list(message); };
    if (isCommand('!memo.help') || content === '!memo') { this.memos.help(message); };
  }
}
