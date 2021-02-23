import Store from 'data-store';

/** Discordのコード記法(バッククォート3つで囲み、ファイルタイプを指定する記述)を作成しやすくするヘルパー関数。 */
const code = (type = 'txt', value: string) => `\`\`\`${type}\n${value}\`\`\``;

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
    const pretty = value == null ? `**${key}** は設定されていません:cry:` : `**${key}**\n${value ? code('md', value) : '値は空です:ghost:'}`;
    return { pretty, key, value };
  }

  /** データストアに値を設定する。 */
  set(key: string, value: string): StoreResult<string> {
    this.store.set(key, value);
    const pretty = `**${key}** ${value ? `に次の内容をメモしました:wink:\n${code('md', value)}` : 'とメモしました:cat:'}`
    return { pretty, key, value };
  }

  /** データストアから値を削除する。 */
  del(key: string): StoreResult<string | undefined> {
    const value  = this.get(key).value;
    const pretty = value == null ? `**${key}** は設定されていません:cry:` : `**${key}** を削除しました:wave:${value ? '\n' + code('md', value) : ''}`;
    if (value != null ) { this.store.del(key); }
    return { pretty, key, value };
  }

  /** 設定されている値をすべて取得する。 */
  data(): Omit<StoreResult<Record<string, string>>, 'key'> {
    const value    = this.store.data;
    const prettyFn = ([key, value]: [string, string]) => `# **${key}**${value ? '\n' + code('md', value) : '\n'}`;
    const pretty   = Object.entries<string>(value).map(prettyFn).join('\n') || `メモがひとつも設定されていません:cry:`;;
    return { pretty, value };
  }
}
