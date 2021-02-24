import { Client, Message, StreamDispatcher, VoiceChannel, VoiceState } from 'discord.js';
import { schedule, ScheduledTask } from 'node-cron';

import { PrettyText } from 'src/lib/pretty-text';
import { DISCORD_NOTIFY_TEXT_CHANNEL_ID, DISCORD_POMODORO_VOICE_CHANNEL_ID } from 'src/environment';

/** デバッグモードフラグ。 */
const DEBUG = false;
/** 1ポモドーロに要する全体の時間。 */
const POMODORO_DURATION = 30;
/** POMODORO_DURATIONのうちの作業時間。 */
const POMODORO_WORK_DURATION = 25;
/** `分`を表すときにかける数字。 */
const MINUTES_CONSTANT = 60 * 1000;

/** `PomodoroService#status()`が返却する値の型。 */
interface Status {
  /** ポモドーロタイマーが始動した時間。 */
  start: Date | null,
  /** ポモドーロタイマーが始動してから経過した時間(分)。 */
  spent: number,
  /** 何度目のポモドーロかの回数。 */
  count: number,
  /** 現在休憩中のときtrueになる。 */
  rest: boolean
}

/** `GenerateText.help`に食わせるヘルプ文の定数。 */
const HELP = {
  DESC: [
    '`!pomodoro` コマンドは、音声チャンネルを利用した**ポモドーロタイマー**を提供します。',
    '**ポモドーロタイマー用音声チャンネルに参加した状態**で、以下のコマンドをご利用ください。'
  ].join('\n'),
  ITEMS: [
    ['!pomodoro.start', 'ポモドーロタイマーを開始(リセット)します'],
    ['!pomodoro.stop', 'ポモドーロタイマーを終了します'],
    ['!pomodoro.status', '現在のポモドーロステータスを表示します'],
    ['!pomodoro.help', '`!pomodoro` コマンドのヘルプを表示します(エイリアス: `!pomodoro`)']
  ]
} as const;

/** node-cronに付加情報を付与するためのインターフェース。 */
interface Scheduled {
  /** scheduled.task  設定されているcron */
  task: ScheduledTask | null;
  /** scheduled.date  タスクが設定(`this.start`)された日時 */
  date: Date | null;
}

/** ポモドーロタイマー機能を提供するアプリケーションクラス。 */
export class PomodoroService {
  private scheduled: Scheduled = { task: null, date: null };

  /** ポモドーロ用音声チャンネルの取得。 */
  private get voiceChannel() {
    return this.client.channels.cache.get(DISCORD_POMODORO_VOICE_CHANNEL_ID || '') as VoiceChannel | undefined;
  }

  constructor(private client: Client) {}

  /** Clientからのイベント監視を開始する。 */
  run() {
    this.client.on('ready', async () => await this.setMute(false));
    this.client.on('voiceStateUpdate', (oldState, newState) => this.onVoiceStateUpdate(oldState, newState));
    this.client.on('message', message => this.onMessage(message));
    return this;
  }

  /** Messageから各処理を呼び出すFacade関数。 */
  private onMessage(message: Message) {
    const content = message.content;
    if (message.author.bot) { return; } // botの発言は無視
    if (content.startsWith('!pomodoro.start')) { this.start(message); };
    if (content.startsWith('!pomodoro.stop')) { this.stop(message); };
    if (content.startsWith('!pomodoro.status')) { this.sendPrettyStatus(message); };
    if (content.startsWith('!pomodoro.help') || content === '!pomodoro') { this.help(message); };
  }

  /**
   * `voiceStateUpdate`イベントの`oldState`と`newState`の状態から、ポモドーロ用音声チャンネルの出入りを検知し、
   * ミュートの状態を適宜切り替える。
   * これにより、作業中に入退室したメンバーのミュート状態を最新に保つ。
   */
  private onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    if (newState.member?.user.bot) { return; }
    if (oldState.channel !== newState.channel && newState.channelID === DISCORD_POMODORO_VOICE_CHANNEL_ID) {
      newState.setMute(!this.getStatus().rest);
    }
    if (oldState.channel !== newState.channel && oldState.channelID === DISCORD_POMODORO_VOICE_CHANNEL_ID && newState.channel) {
      newState.setMute(false);
    }
  }

  /** `this.scheduled`を初期化し、ポモドーロタイマーを起動させて発言通知する。 */
  private start({ channel }: Message) {
    this.scheduled.date = new Date();
    this.scheduled.task = schedule('* * * * *', () => {
      const date   = new Date();
      const status = this.getStatus(date);
      if (status.spent % POMODORO_DURATION === 0 && status.count > 1) { this.doWork(); }
      if (status.spent % POMODORO_DURATION === POMODORO_WORK_DURATION) { this.doRest(); }
    });
    this.doWork();
    channel.send(`ポモドーロを開始します:timer: **:loudspeaker:${this.voiceChannel?.name}** に参加して、作業を始めてください:fire:`);
  }

  /** ポモドーロタイマーを終了し、停止させて発言通知する。 */
  private async stop({ channel }: Message) {
    this.scheduled.date = null;
    this.scheduled.task?.destroy();
    await this.setMute(false);
    channel.send('ポモドーロを終了します:timer: お疲れ様でした:island:');
  }

  /** ステータスをユーザーフレンドリーな文字列として整形した値をメッセージとして発言通知する。 */
  private sendPrettyStatus({ channel }: Message) {
    const status = this.getStatus();
    const date   = status.start?.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const text   = `
    **タイマー開始日時: **_${date ? date + ' :timer:' : '停止中:sleeping:'}_
    **ポモドーロタイマー: **_${status.count} 回目 ${status.spent % POMODORO_DURATION} 分経過_
    **ポモドーロの状態: **_${status.start ? status.rest ? '休憩中:island:' : '作業中:fire:' : '停止中:sleeping:'}_
    `.replace(/\n\s*/g, '\n');
    channel.send(text);
  }

  /** ヘルプを発言通知する。 */
  private help({ channel }: Message) {
    const text = PrettyText.helpList(HELP.DESC, ...HELP.ITEMS);
    channel.send(text);
  }

  /** `this.scheduled.startDate`と`date`の値から差分を計算し、現在のタイマー状況を返却する。 */
  private getStatus(date = new Date()): Status {
    const start = this.scheduled.date;
    if (start == null) { return { start, spent: 0, count: 0, rest: true }; }
    const spent = Math.floor((date.getTime() - start.getTime()) / MINUTES_CONSTANT);
    const count = Math.floor(spent / POMODORO_DURATION) + 1;
    const rest  = spent % POMODORO_DURATION >= POMODORO_WORK_DURATION;
    return { start, spent, count, rest };
  }

  /** ポモドーロの作業時間開始を行う関数。 */
  private async doWork() {
    await this.setMute(false);
    await this.playSound('src/assets/begin-work.ogg');
    await this.setMute(true);
  }

  /** ポモドーロの作業時間終了を行う関数。 */
  private async doRest() {
    await this.setMute(false);
    await this.playSound('src/assets/begin-rest.ogg');
  }

  /** `input`のパスにある音声ファイルを再生する。 */
  private async playSound(input: string) {
    const connection   = this.voiceChannel?.join();
    const dispatcher   = (await connection)?.play(input);
    const promise      = new Promise<StreamDispatcher>((resolve, reject) => {
      return dispatcher?.on('finish', () => resolve(dispatcher)).on('error', e => reject(e));
    }).then(async result => {
      if (DEBUG) { this.sendPrettyStatus({ channel: await this.client.channels.fetch(DISCORD_NOTIFY_TEXT_CHANNEL_ID || '') } as Message); }
      return result;
    });
    return promise;
  }

  /** `this.voiceChannel`のミュート状態を変更する。 */
  private setMute(mute: boolean) {
    return Promise.all(this.voiceChannel?.members.map(member => member.voice.setMute(mute)) || []);
  }
}
