import {
  Client,
  GuildMember,
  VoiceState,
  CategoryChannel,
  VoiceChannel,
  PermissionFlagsBits,
} from "discord.js";
import type { VoiceConfig } from "./types";
import { logger } from "../../shared/libs/logger";

/**
 * Менеджер временных голосовых каналов:
 * - Создаёт персональный канал при входе в лобби
 * - Удаляет, когда пуст
 * - Логирует с точным временем
 */
export class VoiceManager {
  private client: Client;
  private config: VoiceConfig;

  constructor(client: Client, config: VoiceConfig) {
    this.client = client;
    this.config = config;

    this.client.on("voiceStateUpdate", (oldState, newState) =>
      this.onVoiceStateUpdate(oldState, newState)
    );
  }

  private getTimeStamp() {
    const now = new Date();
    return now.toLocaleString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  private async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const userTag = newState.member?.user.tag || oldState.member?.user.tag || "unknown";

    // Вошёл в лобби
    if (
      newState.channelId === this.config.lobbyChannelId &&
      oldState.channelId !== this.config.lobbyChannelId
    ) {
      logger.info(`[${this.getTimeStamp()}] [VOICE] ${userTag} подключился к лобби`);
      await this.handleLobbyJoin(newState.member!);
    }

    // Вышел из канала
    if (
      oldState.channelId &&
      oldState.channelId !== this.config.lobbyChannelId &&
      newState.channelId !== oldState.channelId
    ) {
      logger.info(
        `[${this.getTimeStamp()}] [VOICE] ${userTag} покинул канал "${oldState.channel?.name}"`
      );
      await this.handlePossibleDelete(oldState);
    }

    // Зашёл в чей-то канал
    if (
      newState.channelId &&
      newState.channelId !== this.config.lobbyChannelId &&
      newState.channelId !== oldState.channelId
    ) {
      logger.info(
        `[${this.getTimeStamp()}] [VOICE] ${userTag} зашёл в канал "${newState.channel?.name}"`
      );
    }
  }

  private async handleLobbyJoin(member: GuildMember) {
    const guild = member.guild;
    const category = guild.channels.cache.get(this.config.categoryId) as
      | CategoryChannel
      | undefined;
    if (!category) return;

    const channelName =
      this.config.templateName?.replace("{username}", member.user.username) ||
      `${member.user.username}’s Room`;

    const newChannel = (await guild.channels.create({
      name: channelName,
      type: 2, // GuildVoice
      parent: category.id,
      userLimit: this.config.userLimit
        ? Number(this.config.userLimit)
        : undefined,
      permissionOverwrites: [
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
          ],
        },
        {
          id: guild.roles.everyone.id,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
        },
      ],
    })) as unknown as VoiceChannel;

    logger.info(
      `[${this.getTimeStamp()}] [VOICE] ${member.user.tag} создал канал "${newChannel.name}"`
    );

    await member.voice.setChannel(newChannel);
  }

  private async handlePossibleDelete(oldState: VoiceState) {
    const oldChannel = oldState.channel;
    if (!oldChannel) return;

    if (
      oldChannel.members.size === 0 &&
      oldChannel.parentId === this.config.categoryId
    ) {
      logger.info(
        `[${this.getTimeStamp()}] [VOICE] Удаляю пустой канал "${oldChannel.name}"`
      );
      try {
        await oldChannel.delete("Temporary voice channel is empty");
      } catch {
        // кто-то удалил руками
      }
    }
  }
}
