# discord-bot-sabasabaserver
glitch上で動作させることを前提とした、TypeScriptで実装しているDiscord BOTです。

環境変数をいい感じにすればどのDiscordサーバーでも動くと思います。

## 機能
- `!memo`コマンドによる発言のメモ
  - 本bot起動後、`!memo`と発言することでヘルプが表示されます
- `!pomodoro`コマンドによるポモドーロタイマー機能
  - 本bot起動後、`!pomodoro`と発言することでヘルプが表示されます
- ボイスチャンネルが開始された際の通知

## ローカルへの環境構築
### 前提
- DiscordサーバーにBOTがログインしている状態にしておくこと
- `node.js`のいい感じの環境を整えておくこと

### 手順
1. 本リポジトリをクローンし、`npm i`を実行する
2. プロジェクトのルートディレクトリにある`.env.sample`をコピーして`.env`を作成する
3. `.env`ファイルを編集して環境変数を設定する
4. `npm start`を行うと、アプリが起動し指定されたDiscordサーバーでBOTが動作し始まる

## Glitchへのデプロイ
### 前提
- DiscordサーバーにBOTがログインしている状態にしておくこと
- Glitchにログインしておくこと

### 手順
1. https://glitch.com/ のヘッダーにある `New Project` から `Import from GitHub` を選択して `https://github.com/ver-1000000/discord-bot-sabasabaserver` を入力する
2. Glitchのエディター画面に飛ばされ、しばらくするとファイルが編集できるようになるので、`.env`というファイルを編集して環境変数を設定する
3. `package.json` を選択して **一番下の行に改行を一つ追加** する
  - Glitchは`package.json`に変更があると`npm i`が走るらしい
4. 問題がなければBOTが動作し始める

### 注意
無料プランのGlitch Projectは **5分間放置するとCold状態** になります。

なので、外部から定期的にURLを叩いてCOLDにならないようにする必要があります。  
[Google Apps Script](https://script.google.com/)の場合、以下のコードを `awake.gs` という名前で保存して、  
`トリガー`メニューから**5分おきに`wakeGlitch`を実行する分ベースのタイマー**を作成します。

```gs
const GLITCH_URL = 'https://your-glitch-url.glitch.me';
const wakeGlitch = () => sendGlitch(GLITCH_URL, { type: 'wake' });
const sendGlitch = (uri, json) => {
  const params = {
    contentType : 'application/json; charset=utf-8',
    method : 'post',
    payload : json,
    muteHttpExceptions: true
  };
  UrlFetchApp.fetch(uri, params);
}
```

## 環境変数(.envファイル)の説明
 - `DISCORD_LOGIN_TOKEN`: Discord APIを利用するために必要なトークン
 - `DISCORD_PRESENCE_NAME`: BOTのステータスみたいなところに表示される`○○をプレイ中`の`○○`部分
 - `DISCORD_NOTIFY_TEXT_CHANNEL_ID`: 通知など、BOTが自発的に発言する際のテキストチャンネルID
 - `DISCORD_POMODORO_VOICE_CHANNEL_ID`: ポモドーロ機能で利用するボイスチャンネルのID

## その他
### SabaSabaServerって？
私がこのBOTを稼働させている[イイノテン](https://twitter.com/iinoten)さんの個人Discordサーバーです。

### チャンネルのIDどうやって見るん？
WebブラウザからDiscordにアクセス(https://discord.com/app/)して、お目当てのチャンネルのURL見ればなんとなくわかると思います。

音声チャンネルはURLが表示されないので、開発者ツールとかで該当音声チャンネルのDOMを見るとなんとなくわかると思います。
