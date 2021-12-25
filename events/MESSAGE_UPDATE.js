const client = this;
const [msg] = arguments;

if(msg.type != 0 && msg.type != 19) return;
if(msg.author.bot || msg.author.id == '440064926661476352') return;
if(!msg.guild_id) return;
const guildId = msg.guild_id;
const channelId = msg.channel_id;
const messageId = msg.id;
const guildInfo = client.guildData[guildId];
if(!guildInfo) return;
if(!guildInfo.channels.includes(channelId)) return;

const prev = guildInfo.messageCache.get(messageId);
if(prev == null) return;
const inputContent = client.parseMessage(msg);
if(prev == inputContent) return;

const {chain} = guildInfo;
console.log('[SUBSTITUTION]\t' + prev + ' => ' + inputContent);
chain.unfeed(prev);
chain.feed(inputContent);