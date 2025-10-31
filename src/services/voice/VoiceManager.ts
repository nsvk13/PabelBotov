import { PermissionFlagsBits, ChannelType } from "discord.js";
import type {
  Client,
  GuildMember,
  VoiceState,
  CategoryChannel,
  VoiceChannel,
  VoiceBasedChannel,
} from "discord.js";
import type { VoiceConfig } from "./types";
import { logger } from "../../shared/libs/logger";

/**
 * Менеджер временных голосовых каналов:
 * - Создаёт персональный канал при входе в лобби
 * - Удаляет только те, что сам создал
 * - Не трогает чужие каналы
 * - Нормальные логи
 */
export class VoiceManager {
  private client: Client;
  private config: VoiceConfig;
  private channelOwners: Map<string, string>; // channelId → ownerId

  constructor(client: Client, config: VoiceConfig) {
    this.client = client;
    this.config = config;
    this.channelOwners = new Map();

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

    if (
      newState.channelId === this.config.lobbyChannelId &&
      oldState.channelId !== this.config.lobbyChannelId
    ) {
      logger.info(`[${this.getTimeStamp()}] [VOICE] ${userTag} подключился к лобби`);
      await this.handleLobbyJoin(newState.member!);
      return;
    }

    if (
      oldState.channelId &&
      oldState.channelId !== newState.channelId &&
      oldState.channelId !== this.config.lobbyChannelId
    ) {
      logger.info(
        `[${this.getTimeStamp()}] [VOICE] ${userTag} покинул канал "${oldState.channel?.name}"`
      );
      await this.handlePossibleDelete(oldState);
      return;
    }

    if (
      newState.channelId &&
      newState.channelId !== oldState.channelId &&
      newState.channelId !== this.config.lobbyChannelId
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

    if (!category) {
      logger.warn(
        `[${this.getTimeStamp()}] [VOICE] Категория с ID ${this.config.categoryId} не найдена`
      );
      return;
    }

    const channelName =
      this.config.templateName?.replace("{username}", member.user.username) ||
      `${member.user.username}’s Room`;

    const created = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: category.id,
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
    });

    if (created.type !== ChannelType.GuildVoice) {
      return;
    }

    const newChannel = created as VoiceChannel;

    if (this.config.userLimit) {
      try {
        await newChannel.setUserLimit(Number(this.config.userLimit));
      } catch (e) {
        logger.warn(
          `[${this.getTimeStamp()}] [VOICE] Не удалось выставить userLimit для "${newChannel.name}": ${e}`
        );
      }
    }

    this.channelOwners.set(newChannel.id, member.id);

    logger.info(
      `[${this.getTimeStamp()}] [VOICE] ${member.user.tag} создал канал "${newChannel.name}"`
    );

    try {
      await member.voice.setChannel(newChannel);
    } catch (err) {
      logger.warn(
        `[${this.getTimeStamp()}] [VOICE] Не удалось переместить ${member.user.tag}: ${err}`
      );
    }
  }

  private async handlePossibleDelete(oldState: VoiceState) {
    const oldChannel = oldState.channel as VoiceBasedChannel | null;
    if (!oldChannel) return;

    const isTemp = this.channelOwners.has(oldChannel.id);
    const isEmpty = oldChannel.members.size === 0;

    if (isTemp && isEmpty) {
      const ownerId = this.channelOwners.get(oldChannel.id);
      const ownerTag =
        (ownerId && oldState.guild.members.cache.get(ownerId)?.user.tag) ?? "unknown";

      logger.info(
        `[${this.getTimeStamp()}] [VOICE] Удаляю временный канал "${oldChannel.name}" (владелец ${ownerTag})`
      );

      try {
        await oldChannel.delete("Temporary voice channel is empty");
        this.channelOwners.delete(oldChannel.id);
      } catch (err) {
        logger.warn(
          `[${this.getTimeStamp()}] [VOICE] Ошибка при удалении канала "${oldChannel.name}": ${err}`
        );
      }
    }
  }
}
