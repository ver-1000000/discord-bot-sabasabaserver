import Store from 'data-store';

import { PrettyText } from 'src/lib/pretty-text';

/** `MemosStore`にアクセスした結果を使いやすくするためにラップする型。 */
interface StoreResult<T = string | Record<string, string>> {
  /** ストアにアクセスした結果をユーザーフレンドリーな文字列として整形した値。 */
  pretty: string;
  /** ストアにアクセスするのに利用されたkey。 */
  key: string;
  /** ストアにアクセスして取り出されたvalue。 */
  value: T;
}

/** memoの情報をjsonに永続化して保存するためのストア用クラス。 */
export class MemosStore {
  private store = new Store({ path: `${process.cwd()}/.data/memos.json` });

  constructor() {}

  /** データストアから値を取得する。 */
  get(key: string): StoreResult<string | undefined> {
    const value  = this.store.get(key);
    const pretty = value == null ? `**${key}** は設定されていません:cry:` : `**${key}**\n${value ? PrettyText.code(value) : '値は空です:ghost:'}`;
    return { pretty, key, value };
  }

  /** データストアに値を設定する。 */
  set(key: string, value: string): StoreResult<string> {
    this.store.set(key, value);
    const pretty = `**${key}** ${value ? `に次の内容をメモしました:wink:\n${PrettyText.code(value)}` : 'とメモしました:cat:'}`
    return { pretty, key, value };
  }

  /** データストアから値を削除する。 */
  del(key: string): StoreResult<string | undefined> {
    const value  = this.get(key).value;
    const pretty = value == null ? `**${key}** は設定されていません:cry:` : `**${key}** を削除しました:wave:${value ? '\n' + PrettyText.code(value) : ''}`;
    if (value != null ) { this.store.del(key); }
    return { pretty, key, value };
  }

  /** 設定されている値をすべて取得する。 */
  data(): Omit<StoreResult<Record<string, string>>, 'key'> {
    const value  = this.store.data;
    const pretty = PrettyText.markdownList('', ...Object.entries<string>(value));
    return { pretty, value };
  }
}
