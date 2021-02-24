/**
 * いい感じに整形されたヘルプ文を作成するヘルパー関数。
 */
export class GenerateText {
  /**
   * ヘルプ文を作成する。
   * @param desc  ヘルプの一行目、概要
   * @param ...items[0] 箇条書き項目のタイトル(半角英数字)
   * @param ...items[1] 箇条書き項目の説明(改行なしの短文)
   */
  static help = (desc: string, ...items: Readonly<[string, string]>[]) => {
    const padEndCount = Math.max(...items.map(([key, _]) => key.length));
    const body        = items.map(([key, value]) => `_**\`${key.padEnd(padEndCount)}\`**_ - ${value}`).join('\n');
    return desc + '\n\n' + body;
  }
  /**
   * ヘルプ文を作成する。
   */
  static markdown = (desc: string, ...items: [string, string][]) => {
    const padEndCount = Math.max(...items.map(([key, _]) => key.length));
    const body        = items.map(([key, value]) => `_**\`${key.padEnd(padEndCount)}\`**_ - ${value}`).join('\n');
    return desc + '\n\n' + body;
  }
}
