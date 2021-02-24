import { Client, TextChannel, VoiceState } from 'discord.js';

import { DISCORD_NOTIFY_TEXT_CHANNEL_ID } from 'src/environment';

/** 音声チャンネルへの通知を目的とした機能を提供するサービスクラス。 */
export class NotifyVoiceChannelService {
  constructor(private client: Client) {}

  /** Clientからのイベント監視を開始する。 */
  run() {
    this.client.on('voiceStateUpdate', (oldState, newState) => this.onVoiceStateUpdate(oldState, newState));
    return this;
  }

  /**
   * `voiceStateUpdate`イベントの`oldState`と`newState`の状態から、「音声チャンネルに最初の一人が入室したとき」を検知し、
   * `DISCORD_NOTIFY_CHANNEL_ID`の通知用チャンネルに通知する。
   */
  private onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    if (oldState.channelID == null && newState.channelID && newState.member && newState.channel && newState.channel.members.size === 1) {
      const notifyChannel = this.client.channels.cache.get(DISCORD_NOTIFY_TEXT_CHANNEL_ID || '') as TextChannel | undefined;
      const text          = `:loudspeaker: **${newState.member}** が **${newState.channel.name}** でボイスチャンネルを開始しました`;
      notifyChannel?.send(text);
    }
  }
}
