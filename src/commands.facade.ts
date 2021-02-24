import { Client, Message } from 'discord.js';

import { MemosService } from 'src/services/memos.service';
import { PomodoroService } from 'src/services/pomodoro.service';

/**
 * Messageを解析してコマンドを判定し、コマンドごとに処理を行うクラス。
 * Facadeの役割を持ち、ロジックの具体的な実装は他のクラスで行う。
 */
export class CommandsFacade {
  private memos = new MemosService();

  constructor(private client: Client, private pomodoro: PomodoroService) {}

  /** Clientからのメッセージイベント監視を開始する。 */
  run() {
    this.client.on('message', message => this.onMessage(message));
  }

  /** Messageから各処理を呼び出すFacade関数。 */
  private onMessage(message: Message) {
    const content   = message.content;
    const isCommand = (command: string) => content.startsWith(command);
    if (message.author.bot) { return; } // botの発言は無視
    if (isCommand('!memo.get')) { this.memos.get(message); };
    if (isCommand('!memo.set')) { this.memos.set(message); };
    if (isCommand('!memo.remove')) { this.memos.remove(message); };
    if (isCommand('!memo.list')) { this.memos.list(message); };
    if (isCommand('!memo.help') || content === '!memo') { this.memos.help(message); };
    if (isCommand('!pomodoro.start')) { this.pomodoro.start(message); };
    if (isCommand('!pomodoro.stop')) { this.pomodoro.stop(message); };
    if (isCommand('!pomodoro.status')) { this.pomodoro.prettyStatus(message); };
    if (isCommand('!pomodoro.help') || content === '!pomodoro') { this.pomodoro.help(message); };
  }
}
