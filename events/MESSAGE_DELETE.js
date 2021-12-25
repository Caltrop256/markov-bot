const client = this;
const [msg] = arguments;

if(!msg.guild_id) return;
const guildInfo = client.guildData[msg.guild_id];
if(!guildInfo) return;
const parsed = guildInfo.messageCache.get(msg.id);
if(!parsed) return;
console.log('[DELETED]\t' + parsed);
guildInfo.chain.unfeed(parsed);