import { Client, Events, GatewayIntentBits } from "discord.js";
import { registerVoiceHandler } from "./bot/handlers/voiceHandler";
import { logger } from "./shared/libs/logger";

const token = Bun.env.DISCORD_BOT_TOKEN!;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, (c) => {
  logger.info(`✅ Logged in as ${c.user.tag}`);

  registerVoiceHandler(client);

  logger.info("🎧 Voice handler initialized");
});

client.login(token);

console.log("🚀 PavelBotov successfully launched");