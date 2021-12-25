const client = this;
const [info] = arguments;

if(!info.guild_id) return;
const guildInfo = client.guildData[info.guild_id];
if(!guildInfo) return;
for(const id of info.ids) {
    const parsed = guildInfo.messageCache.get(id);
    if(!parsed) continue;
    console.log('[DELETED]\t' + parsed);
    guildInfo.chain.unfeed(parsed);
}