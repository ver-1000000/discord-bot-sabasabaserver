import { Client, Message, VoiceChannel, VoiceState } from 'discord.js';

import generateHelpText from 'src/helpers/generate-help-text';
import { DISCORD_POMODORO_VOICE_CHANNEL_ID } from 'src/environment';

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

/**
 * `PomodoroService`で利用されるタイマークラス。
 * タイマーが始動した時間と、分ごとの動作を監視する関数を提供する。
 */
class MinutesTimer {
  /** `this.on`関数が呼ばれた日時。 */
  startDate: Date | null = null;

  constructor() {}

  /** 1分ごとにコールバック関数を実行する監視関数。 */
  on(callback: (callbackDate: Date) => void) {
    this.startDate = new Date(new Date().setSeconds(0));
    /** onを複数回走らせたときに、timerが重複しないように確認するための`this.start`参照。 */
    const copiedStartDate = this.startDate;
    /** 1000ms間隔で`timerMinutes`を`date`の値で呼び出す。 */
    const timer = (date: Date) => setTimeout(() => timerMinutes(date), 1000);
    /**
     * 渡された`date`と現在の日時(`compareDate`)のMinutesに違いがあれば、コールバックを実行して新しいtimerを呼び、
     * 違いがなければ、コールバックは実行せず渡された`date`でtimerを呼ぶ。
     */
    const timerMinutes = (date: Date) => {
      const compareDate = new Date();
      if (copiedStartDate !== this.startDate) { // 他のonが走っているので終了
        return;
      } else if (date.getMinutes() === compareDate.getMinutes()) {
        timer(date);
      } else {
        callback(compareDate);
        timer(compareDate);
      }
    };
    timerMinutes(copiedStartDate);
  }

  /** `this.startDate`にnullを入れることで、現在のタイマーを停止する。 */
  off() {
    this.startDate = null;
  }
}

/** ポモドーロタイマー機能を提供するアプリケーションクラス。 */
export class PomodoroService {
  private minutesTimer = new MinutesTimer();

  /** ポモドーロ用音声チャンネルの取得。 */
  private get voiceChannel() {
    return this.client.channels.cache.get(DISCORD_POMODORO_VOICE_CHANNEL_ID || '') as VoiceChannel | undefined;
  }

  constructor(private client: Client) {}

  /** Clientからの音声チャンネルイベント監視を開始する。 */
  async run() {
    await this.setMute(false);
    this.client.on('voiceStateUpdate', (oldState, newState) => this.onVoiceStateUpdate(oldState, newState));
  }

  /** `this.minutesTimer`を初期化し、ポモドーロタイマーを起動させる。 */
  start({ channel }: Message) {
    this.minutesTimer.on(date => {
      const status = this.getStatus(date);
      if (status.spent % POMODORO_DURATION === 0 && status.count > 1) { this.doWork(); }
      if (status.spent % POMODORO_DURATION === POMODORO_WORK_DURATION) { this.doRest(); }
    });
    this.doWork();
    channel.send(`ポモドーロを開始します:timer:\n**:loudspeaker:${this.voiceChannel?.name}** に参加して、作業を始めてください:fire:`);
  }

  /** ポモドーロタイマーを終了し、停止させる。 */
  async stop({ channel }: Message) {
    this.minutesTimer.off();
    await this.setMute(false);
    channel.send('ポモドーロを終了します:timer: お疲れ様でした:island:');
  }

  /** ステータスをユーザーフレンドリーな文字列として整形した値をメッセージとして配信する。 */
  prettyStatus({ channel }: Message) {
    const status = this.getStatus();
    const text   = `
    **タイマー開始日時: **_${status.start?.toLocaleString('ja-JP') || '停止中'}:timer:_
    **ポモドーロタイマー: **_${status.count} 回目 ${status.spent % POMODORO_DURATION} 分経過_
    **ポモドーロの状態: **_${status.start ? status.rest ? '休憩中:island:' : '作業中:fire:' : '停止中:sleeping:'}_
    `.replace(/\n\s*/g, '\n');
    channel.send(text);
  }

  /** ヘルプを表示する。 */
  help({ channel }: Message) {
    const desc = [
      '`!pomodoro` コマンドは、音声チャンネルを利用した**ポモドーロタイマー**を提供します。',
      '**ポモドーロタイマー用音声チャンネルに参加した状態**で、以下のコマンドをご利用ください。'
    ].join('\n');
    const text = generateHelpText(
      desc,
      ['!pomodoro.start', 'ポモドーロタイマーを開始(リセット)します'],
      ['!pomodoro.stop', 'ポモドーロタイマーを終了します'],
      ['!pomodoro.status', '現在のポモドーロステータスを表示します'],
      ['!pomodoro.help', '`!pomodoro` コマンドのヘルプを表示します(エイリアス: `!pomodoro`)'],
    );
    channel.send(text);
  }

  /** `this.minutesTimer.startDate`と`date`の値から差分を計算し、現在のタイマー状況を返却する。 */
  private getStatus(date = new Date()): Status {
    const start = this.minutesTimer.startDate;
    if (start == null) { return { start, spent: 0, count: 0, rest: true }; }
    const spent = Math.floor((date.getTime() - start.getTime()) / MINUTES_CONSTANT);
    const count = Math.floor(spent / POMODORO_DURATION) + 1;
    const rest  = spent % POMODORO_DURATION >= POMODORO_WORK_DURATION;
    return { start, spent, count, rest };
  }

  /** ポモドーロの作業時間開始を行う関数。 */
  private async doWork() {
    await this.setMute(false);
    const playing = await this.playSound('src/assets/begin-work.ogg');
    playing?.on('finish', () => this.setMute(true));
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
    dispatcher?.on('error', console.error);
    return dispatcher;
  }

  /** `this.voiceChannel`のミュート状態を変更する。 */
  private setMute(mute: boolean) {
    return Promise.all(this.voiceChannel?.members.map(member => member.voice.setMute(mute)) || []);
  }

  /**
   * `voiceStateUpdate`イベントの`oldState`と`newState`の状態から、ポモドーロ用音声チャンネルの出入りを検知し、
   * ミュートの状態を適宜切り替える。
   * これにより、作業中に入退室したメンバーのミュート状態を最新に保つ。
   */
  private onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    if (newState.member?.user.bot) { return; }
    if (oldState.channelID !== newState.channelID && newState.channelID === DISCORD_POMODORO_VOICE_CHANNEL_ID) {
      newState.setMute(!this.getStatus().rest);
    }
    if (oldState.channelID !== newState.channelID && oldState.channelID === DISCORD_POMODORO_VOICE_CHANNEL_ID) {
      newState.setMute(false);
    }
  }
}
