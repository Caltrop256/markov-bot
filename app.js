const Discord = require('discord.js');
const config = require('./config.json');
const Chain = require('./chain.js');
const fs = require('fs');

const client = new Discord.Client({
    allowedMentions: {
        repliedUser: false,
        parse: ['users']
    },
    intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MEMBERS']
});

const chains = new Map();
for(const gId in config.guilds) {
    const chain = new Chain();
    const path = './chain-store/' + gId + '.json'
    if(fs.existsSync(path)) {
        const data = JSON.parse(fs.readFileSync(path, {encoding: 'utf8'}));
        chain.import(data);
    }
    chains.set(gId, chain);
}

function parseMessage(msg) {
    let content = msg.content
        .replace(/<@!?(\d+)>/g, Chain.escape)
        .replace(/<#!?(\d+)>/g, Chain.escape)
        .replace(/<a?:.+?:(\d+)>/g, Chain.escape)
        .replace(/<@&!?(\d+)>/g, Chain.escape)
        .replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g, Chain.escape);

    if(content.trim().length && msg.attachments.size) {
        const attachArr = Array.from(msg.attachments);
        for(let i = 0; i < attachArr.length; ++i) {
            content += ' ' + Chain.escape(attachArr[i][1].url);
        }
    }
    return content.trim();
}

client.once('ready', () => {
    console.log("[READY]");
    client.user.setPresence({
        afk: false,
        status: 'online',
        activities: [
            {
                type: 'LISTENING',
                name: 'you :)'
            }
        ]
    })
    client.on('messageCreate', msg => {
        const guildInfo = config.guilds[msg.channel?.guild?.id];
        const chain = chains.get(msg.channel.guild.id);
        if(msg.author.bot || !guildInfo || !guildInfo.enabled || !guildInfo.channels.includes(msg.channel.id) || !msg.content) return;

        const content = parseMessage(msg);

        if(Math.random() < guildInfo.responseChance) {
            const isReply = Math.random() < guildInfo.replyChance;
            const sendFunc = isReply ? msg.reply.bind(msg) : msg.channel.send.bind(msg.channel);
            const data = {
                content: ''
            };

            if(isReply) {
                const canidates = content.split(' ').sort((a, b) => b.length - a.length);
                let travelled = 0;
                outer:
                for(let i = 0; i < canidates.length; ++i) {
                    for(let j = 0; j < 3; ++j) {
                        const node = chain.nodes[j].get(canidates[i]);
                        if(node) {
                            data.content += (Math.random() < 0.25 ? '\n' : ' ') + chain.generate(node);
                            travelled += chain.__nodesTravelled;
                            if(travelled >= 2) break outer;
                            else continue outer;
                        }
                    }
                }
            } else {
                let travelled = 0;
                const startWords = Array.from(chain.nodes[0]);
                while(startWords.length && travelled <= 2) {
                    const node = startWords.splice((Math.random() * startWords.length) | 0, 1)[0][1];
                    data.content += (Math.random() < 0.25 ? '\n' : ' ') + chain.generate(node);
                    travelled += chain.__nodesTravelled;
                }
            }
            
            data.content = data.content.trim();
            if(data.content) {
                console.log("[Generated] " + data.content);
                const len = data.content.length;
                const minimumDelay = 100;
                function typeMessage(remaining, n) {
                    if(remaining < 0) sendFunc(data).catch(err => console.error('Error sending message:', err));
                    else {
                        if(!n) msg.channel.sendTyping().catch(() => {});
                        setTimeout(typeMessage, minimumDelay, remaining - minimumDelay, (n + 1) % 15);
                    }
                }
                typeMessage(len * minimumDelay, 0);
            };
        }

        chain.feed(content);
        console.log("[Received] " + content);
    });

    client.on('messageDelete', msg => {
        if(!msg.channel.guild || !msg.channel.guild.id) return;

        const guildInfo = config.guilds[msg.channel.guild.id];
        if(msg.author.bot || !guildInfo || !guildInfo.enabled || !guildInfo.channels.includes(msg.channel.id) || !msg.content) return;

        const chain = chains.get(msg.channel.guild.id);
        const content = parseMessage(msg);
        console.log('[Deleted] ' + content);
        chain.unfeed(content);
    })

    client.on('messageUpdate', (msg0, msg1) => {
        if(msg0.content == msg1.content) return;
        if(!msg0.channel.guild || !msg0.channel.guild.id) return;

        const guildInfo = config.guilds[msg0.channel.guild.id];
        if(msg0.author.bot || !guildInfo || !guildInfo.enabled || !guildInfo.channels.includes(msg0.channel.id) || !msg0.content) return;

        const chain = chains.get(msg0.channel.guild.id);
        const content0 = parseMessage(msg0);
        const content1 = parseMessage(msg1);
        console.log('[Substitution] ' + content0 + ' => ' + content1);
        chain.unfeed(content0);
        chain.feed(content1);
    })
});

function storeChains() {
    for(const [gId, chain] of chains) {
        console.log('[SYSTEM] Storing Chain!: ' + gId);
        fs.writeFileSync('./chain-store/' + gId + '.json', JSON.stringify(chain.export()), {encoding: 'utf8'});
    }
}

setInterval(storeChains, 60000 * 10);

client.login(config.token);

function __handleShutdown() {
    console.log("SHUTTING DOWN!!");
    console.log('Backing up!');
    storeChains();
    console.log("finished!");
    process.exit(0);
}

for (let sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, __handleShutdown);
}