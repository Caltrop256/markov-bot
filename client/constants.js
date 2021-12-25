export default new class Constants {
    intents = {
        GUILDS: 1 << 0,
        GUILD_MEMBERS: 1 << 1,
        GUILD_BANS: 1 << 2,
        GUILD_EMOJIS: 1 << 3,
        GUILD_INTEGRATIONS: 1 << 4,
        GUILD_WEBHOOKS: 1 << 5,
        GUILD_INVITES: 1 << 6,
        GUILD_VOICE_STATES: 1 << 7,
        GUILD_PRESENCES: 1 << 8,
        GUILD_MESSAGES: 1 << 9,
        GUILD_MESSAGE_REACTIONS: 1 << 10,
        GUILD_MESSAGE_TYPING: 1 << 11,
        DIRECT_MESSAGES: 1 << 12,
        DIRECT_MESSAGE_REACTIONS: 1 << 13,
        DIRECT_MESSAGE_TYPING: 1 << 14,
        GUILD_SCHEDULED_EVENTS: 1 << 16
    }
    opcodes = {
        dispatch: 0, 
        heartbeat: 1,
        identify : 2,
        presenceUpdate: 3,
        voiceStateUpdate: 4,
        resume: 6,
        reconnect: 7,
        requestGuildMembers: 8,
        invalidSession: 9,
        hello: 10,
        acknowledged: 11
    }

    constructor() {
        let iAll = 0;
        for(const k in this.intents) {
            iAll |= this.intents[k];
        }
        this.intents.ALL = iAll;
    }
}