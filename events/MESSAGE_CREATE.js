const client = this;
const [msg] = arguments;

function generateTokens(chain, inputContent, data) {
    const minimumLength = Math.min(chain.stored, Math.trunc(Math.pow(Math.exp(Math.random()), 3)));

    const tokens = [];
    let generatedOnce = false;

    const prominenceScore = str => {
        if(str.charCodeAt(0) & (1 << 5)) return 0;
        const chars = str.split('').map(s => s.toLowerCase().charCodeAt(0));
        let sum = 0;
        for(let i = 1; i < chars.length - 1; ++i) {
            sum += Math.abs(chars[i] - chars[i + 1]);
        }
        return sum;
    }
    const promTokens = [...new Set(chain.tokenize(inputContent))]
        .map(s => [s, prominenceScore(s)])
        .sort((s0, s1) => s1[1] - s0[1]);
    const totalProminence = promTokens.reduce((total, val) => total + val[1], 0);
    switch(promTokens.some(t => chain.find(t[0].substring(1)).length) && Math.exp(Math.random() - (1 / totalProminence) * 750) > Math.random()) {
        case true :
            let i = 0;
            const inpTokens = promTokens.map(a => a[0]);
            while(tokens.length < minimumLength) {
                const related = chain.find(inpTokens[i].substring(1));
                if(related.length) {
                    const start = related[Math.floor(Math.random() * related.length)];
                    if(generatedOnce) tokens.push(chain.emptyToken);
                    generatedOnce = true;
                    tokens.push.apply(tokens, chain.generate(start));
                }
                i += 1;
                i %= inpTokens.length;
            };
            if(tokens.length) break;
        case false :
            delete data.message_reference;
            while(tokens.length < minimumLength) {
                const randomToken = chain.indexToIdentifier[Math.floor(Math.random() * chain.indexToIdentifier.length)];
                if(generatedOnce) tokens.push(chain.emptyToken);
                generatedOnce = true;
                tokens.push.apply(tokens, chain.generate(randomToken));
            }
    }
    return tokens;
}
if(msg.type != 0 && msg.type != 19) return;
if(msg.author.bot || msg.author.id == '440064926661476352') return;
if(!msg.guild_id) {
    if(Math.random() > 0.25 || client.http.opts.headers['Authorization'].startsWith('Bot ')) return;
    client.http.get(`/users/${msg.author.id}/profile?with_mutual_guilds=true`).then(user => {
        const {mutual_guilds} = user;
        const chains = [];
        for(const guild of mutual_guilds) {
            if(client.guildData[guild.id]) chains.push(client.guildData[guild.id].chain);
        }
        if(chains.length) {
            const chain = chains[Math.floor(Math.random() * chains.length)];
            if(!chain.stored) return;
            const data = {
                content: '',
                tts: false,
                allowed_mentions: { parse: ['users'] }
            }
            const tokens = generateTokens(chain, client.parseMessage(msg), data);
            const combined = chain.combineTokens(tokens);
            const sendOrder = chain.debugTokens([combined])[0];
            data.content = sendOrder.str;

            if(data.content) {
                client.http.get(`/users/@me/channels`).then(DMChannels => {
                    const channel = DMChannels.find(c => c.recipients.length == 1 && c.recipients[0].id == msg.author.id);
                    if(!channel) return;
                    console.log('[GENERATED DM]\t' + data.content);
                    const len = data.content.length;
                    const minimumDelay = 100;
                    function typeMessage(remaining, n) {
                        if(remaining < 0) client.http.post(`/channels/${channel.id}/messages`, data).catch(console.error);
                        else {
                            if(!n) client.http.post(`/channels/${channel.id}/typing`).catch(console.error);
                            setTimeout(typeMessage, minimumDelay, remaining - minimumDelay, (n + 1) % 30);
                        }
                    }
                    typeMessage(len * minimumDelay, 0);
                });
            }
        }
    }).catch(() => {});
    return;
}
const guildId = msg.guild_id;
const channelId = msg.channel_id;
const messageId = msg.id;
const guildInfo = client.guildData[guildId];
if(!guildInfo) return;
if(!guildInfo.channels.includes(channelId)) return;

const inputContent = client.parseMessage(msg);
if(!inputContent) return;

guildInfo.messageCache.set(messageId, inputContent);

const {chain} = guildInfo;
if(chain.stored && Math.random() < guildInfo.triggerChance) {
    const data = {
        content: '',
        tts: false,
        allowed_mentions: {
            parse: ['users'],
            replied_user: false
        },
        message_reference: {
            guild_id: guildId,
            channel_id: channelId,
            message_id: messageId,
            fail_if_not_exists: false
        }
    }
    const tokens = generateTokens(chain, inputContent, data);
    const combined = chain.combineTokens(tokens);
    const sendOrder = chain.debugTokens([combined])[0];
    data.content = sendOrder.str;

    if(data.content) {
        console.log('[GENERATED]\t' + data.content);
        const len = data.content.length;
        const minimumDelay = 100;
        function typeMessage(remaining, n) {
            if(remaining < 0) client.http.post(`/channels/${channelId}/messages`, data).catch(console.error);
            else {
                if(!n) client.http.post(`/channels/${channelId}/typing`).catch(console.error);
                setTimeout(typeMessage, minimumDelay, remaining - minimumDelay, (n + 1) % 30);
            }
        }
        typeMessage(len * minimumDelay, 0);
    }
}

console.log('[RECEIVED]\t' + inputContent);
chain.feed(inputContent, 1);