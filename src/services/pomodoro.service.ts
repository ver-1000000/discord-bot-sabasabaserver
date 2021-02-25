import { Client, Message, StreamDispatcher, VoiceChannel, VoiceState } from 'discord.js';
import { schedule, ScheduledTask } from 'node-cron';

import { PrettyText } from 'src/lib/pretty-text';
import { DISCORD_NOTIFY_TEXT_CHANNEL_ID, DISCORD_POMODORO_VOICE_CHANNEL_ID } from 'src/environment';

/** デバッグモードフラグ。 */
const DEBUG = false;
/** 1ポモドーロに要する全体の時間。 */
const POMODORO_DURATION = DEBUG ? 2 : 30;
/** POMODORO_DURATIONのうちの作業時間。 */
const POMODORO_WORK_DURATION = DEBUG ? 1 : 25;

/** `PomodoroService`の現在の状態を表すクラス。 */
class Status {
  /** ポモドーロタイマーが始動した時間。 */
  start: Date | null = null;
  /** ポモドーロタイマーが始動してから経過した時間(分)。 */
  spent = 0;
  /** 何度目のポモドーロかの回数。 */
  count = 0;
  /** 現在休憩中のときtrueになる。 */
  rest = false;
  /** 設定されているcronのスケジュール。 */
  task: ScheduledTask | null = null;

  constructor() {}

  /** 初期値に戻す。 */
  reset() {
    this.start = null;
    this.spent = 0;
    this.count = 0;
    this.rest  = false;
    this.task?.destroy();
  }
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

/** ポモドーロタイマー機能を提供するアプリケーションクラス。 */
export class PomodoroService {
  private status = new Status();

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
      newState.setMute(!this.status.rest);
    }
    if (oldState.channel !== newState.channel && oldState.channelID === DISCORD_POMODORO_VOICE_CHANNEL_ID && newState.channel) {
      newState.setMute(false);
    }
  }

  /** cronの通知を監視する。 `this.status.spent`を加算していき、`this.status`の値の内容で様々な副作用を呼び起こす。 */
  private onSchedule() {
    this.status.spent++;
    if (DEBUG) { console.log({ ...this.status, task: !!this.status.task }); }
    if (this.status.spent === POMODORO_WORK_DURATION) { this.doRest(); }
    if (this.status.spent === POMODORO_DURATION) { this.doWork(); }
  }

  /** `this.status`を初期化し、ポモドーロタイマーを起動させて発言通知する。 */
  private start({ channel }: Message) {
    this.status.reset();
    this.status.start = ((d: Date) => { d.setSeconds(0); return d })(new Date());
    this.status.task  = schedule('* * * * *', () => this.onSchedule());
    this.doWork();
    channel.send(`ポモドーロを開始します:timer: **:loudspeaker:${this.voiceChannel?.name}** に参加して、作業を始めてください:fire:`);
    this.client.user?.setPresence({ activity: { name: '🍅ポモドーロ', type: 'PLAYING' } });
  }

  /** ポモドーロタイマーを終了/停止させて発言通知する。 */
  private async stop({ channel }: Message) {
    this.status.reset();
    await this.setMute(false);
    channel.send('ポモドーロを終了します:timer: お疲れ様でした:island:');
    this.client.user?.setPresence({ activity: { name: 'みんなの発言', type: 'WATCHING' } });
  }

  /** ステータスをユーザーフレンドリーな文字列として整形した値をメッセージとして発言通知する。 */
  private sendPrettyStatus({ channel }: Message) {
    const date = this.status.start?.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const text = `
    **タイマー開始日時: **_${date ? date + ' :timer:' : '停止中:sleeping:'}_
    **ポモドーロタイマー: **_${this.status.count} 回目 ${this.status.spent % POMODORO_DURATION} 分経過_
    **ポモドーロの状態: **_${this.status.start ? this.status.rest ? '休憩中:island:' : '作業中:fire:' : '停止中:sleeping:'}_
    `.replace(/\n\s*/g, '\n');
    channel.send(text);
  }

  /** ヘルプを発言通知する。 */
  private help({ channel }: Message) {
    const text = PrettyText.helpList(HELP.DESC, ...HELP.ITEMS);
    channel.send(text);
  }

  /** ポモドーロの作業時間開始を行う関数。 */
  private async doWork() {
    this.status.count++;
    this.status.spent = 0;
    this.status.rest  = false;
    await this.setMute(false);
    await this.playSound('src/assets/begin-work.ogg');
    await this.setMute(true);
  }

  /** ポモドーロの作業時間終了を行う関数。 */
  private async doRest() {
    this.status.rest = true;
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

  /**
   * `this.voiceChannel`のミュート状態を変更する。
   * - `member.voice.connection`を確認することで、Promiseの解決中に離脱したユーザーをミュートして例外が発生するのを防ぐ
   */
  private setMute(mute: boolean) {
    return Promise.all(this.voiceChannel?.members.map(member => member.voice.channel ? member.voice.setMute(mute) : member) || []);
  }
}
