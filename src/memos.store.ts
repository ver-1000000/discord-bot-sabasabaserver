import Store from 'data-store';

import { code } from './command-by-message';

/** memoの情報をjsonに永続化して保存するためのストア用クラス。 */
export class MemosStore {
  private store = new Store({ path: `${process.cwd()}/.data/memos.json` });

  constructor() {}

  /** データストアから値を取得する。 */
  get(key: string): undefined | string {
    return this.store.get(key);
  }

  /** データストアに値を設定する。 */
  set(key: string, value: string) {
    return this.store.set(key, value);
  }

  /** データストアから値を削除する。 */
  del(key: string) {
    this.store.del(key);
  }

  /** 指定されたキーの値を整形したテキストにして返却する。 */
  showall() {
    const memos = Object.entries<string>(this.store.data);
    return memos.map(([key, value]) => `# **${key}**${value ? '\n' + code('md', value) : '\n'}`).join('\n') || `メモがひとつも設定されていません:cry:`;
  }
}
