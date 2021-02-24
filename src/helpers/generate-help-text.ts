/**
 * いい感じに整形されたヘルプ文を作成するヘルパー関数。
 * @param desc  ヘルプの一行目、概要
 * @param items 箇条書きで表示するためのヘルプの説明
 */
export default (desc: string, ...items: [string, string][]) => {
  const padEndCount = Math.max(...items.map(([key, _]) => key.length));
  const body        = items.map(([key, value]) => `_**\`${key.padEnd(padEndCount)}\`**_ - ${value}`).join('\n')
  return desc + '\n\n' + body;
}
