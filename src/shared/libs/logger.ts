import pino from "pino";

export const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standart",
            ignore: "pid,hostname",
        },
    },
    level: Bun.env.NODE === "production" ? "info" : "debug",
});