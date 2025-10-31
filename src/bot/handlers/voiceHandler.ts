import { Client } from "discord.js";
import { VoiceManager } from "../../services/voice/VoiceManager";
import { logger } from "../../shared/libs/logger";

// TO-DO: Вывести в config.ts
const voiceConfig = {
  lobbyChannelId: "1419719687796687031",
  categoryId: "1419719110069325875",
  templateName: "Комната {username}",
  userLimit: 5,
};

export function registerVoiceHandler(client: Client) {
  new VoiceManager(client, voiceConfig);
  logger.info("VoiceManager initialized");
}
