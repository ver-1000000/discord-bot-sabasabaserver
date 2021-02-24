require('dotenv').config();

/** `.env`ファイルから定数を読み取ってオブジェクトとして提供する環境変数。 */
export const {
  DISCORD_LOGIN_TOKEN,
  DISCORD_PRESENCE_NAME,
  DISCORD_NOTIFY_TEXT_CHANNEL_ID,
  DISCORD_POMODORO_VOICE_CHANNEL_ID
} = process.env;

