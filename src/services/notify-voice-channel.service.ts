import { Client, TextChannel, VoiceState } from 'discord.js';

import { DISCORD_NOTIFY_CHANNEL_ID } from 'src/environment';

/** 起点となるメインのアプリケーションクラス。 */
export class NotifyVoiceChannelService {
  constructor() {}

  /**
   * `voiceStateUpdate`イベントの`oldState`と`newState`の状態から、「音声チャンネルに最初の一人が入室したとき」を検知し、
   * `DISCORD_NOTIFY_CHANNEL_ID`の通知用チャンネルに通知する。
   */
  run(oldState: VoiceState, newState: VoiceState, client: Client) {
    if (oldState.channelID == null && newState.channelID && newState.member && newState.channel && newState.channel.members.size === 1) {
      const notifyChannel = client.channels.cache.get(DISCORD_NOTIFY_CHANNEL_ID || '') as TextChannel | undefined;
      const text          = `:loudspeaker: **${newState.member}** が **${newState.channel.name}** でボイスチャンネルを開始しました`;
      notifyChannel?.send(text);
    }
  }
}
