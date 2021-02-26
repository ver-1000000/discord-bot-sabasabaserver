import Store from 'data-store';
import { ScheduledTask } from 'node-cron';

/** ポモドーロの現在の状態を表すモデル。 */
export class PomodoroStatus {
  private store = new Store({ path: `${process.cwd()}/.data/pomodoro.json` }, { startAt: null, spent: 0, wave: 0 });
  /** `node-cron`のスケジュール。 jsonに書き込まずオンメモリで管理するため、強制終了で揮発する。 */
  private scheduleTask: ScheduledTask | null = null;

  constructor() {
  }

  /** ポモドーロタイマーが始動した時間。 */
  get startAt() {
    const startAt = this.store.get('startAt');
    return startAt ? new Date(startAt) : null;
  }

  set startAt(startAt: Date | null) {
    this.store.set('startAt', startAt);
  }

  /** ポモドーロタイマーが始動してから経過した時間(分)。 */
  get spent() {
    return this.store.get('spent')
  }

  set spent(spent: number) {
    this.store.set('spent', spent);
  }

  /** 何度目のポモドーロかの回数。 */
  get wave() {
    return this.store.get('wave')
  }

  set wave(wave: number) {
    this.store.set('wave', wave);
  }

  /** 現在休憩中のときtrueになる。 */
  get rest() {
    return this.store.get('rest')
  }

  set rest(rest: boolean) {
    this.store.set('rest', rest);
  }

  /** 設定されているcronのスケジュール。 */
  get task() {
    return this.scheduleTask;
  }

  set task(task: ScheduledTask | null) {
    this.scheduleTask = task;
  }

  /** デフォルト値に戻す。 */
  reset() {
    this.startAt = null;
    this.spent   = 0;
    this.wave    = 0;
    this.rest    = false;
    this.scheduleTask?.destroy();
  }
}
