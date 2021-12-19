import Discord from 'discord.js';
import fs from 'fs';
import Markov from './chain.js';

const events = {
    messageCreate(msg) {
        if(msg.author.bot) return;
        if(!msg.channel.guild || !(msg.channel.guild.id in this.guildData)) return;
        const guildInfo = this.guildData[msg.channel.guild.id];
        if(!guildInfo.channels.includes(msg.channel.id)) return;

        const inputContent = this.parseMessage(msg);
        const {chain} = guildInfo;

        if(chain.stored && Math.random() < guildInfo.triggerChance) {
            const minimumLength = Math.min(chain.stored, Math.trunc(Math.pow(Math.exp(Math.random()), 3)));
            
            const data = {
                content: ''
            }

            const tokens = [];
            let generatedOnce = false;

            const prominenceScore = str => {
                if(str.charCodeAt(0) & (1 << Markov.id.puncMaskBitIndex)) return 0;
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
            let destination = null;
            switch(Math.exp(Math.random() - (1 / totalProminence) * 750) > Math.random()) {
                case true :
                    destination = msg.reply.bind(msg);
                    let i = 0;
                    const inpTokens = promTokens.map(a => a[0]);
                    while(tokens.length < minimumLength && i < inpTokens.length) {
                        let startToken = null;
                        if(chain.nodes.has(inpTokens[i])) startToken = inpTokens[i];
                        else {
                            const related = chain.find(inpTokens[i].substring(1));
                            if(related.length) startToken = related[Math.floor(Math.random() * related.length)];
                        }
                        if(startToken) {
                            if(generatedOnce) tokens.push(chain.emptyToken);
                            generatedOnce = true;
                            tokens.push.apply(tokens, chain.generate(startToken));
                        }
                        i += 1;
                    };
                    if(tokens.length) break;
                case false :
                    destination = msg.channel.send.bind(msg.channel);
                    while(tokens.length < minimumLength) {
                        const randomToken = chain.indexToIdentifier[Math.floor(Math.random() * chain.indexToIdentifier.length)];
                        if(generatedOnce) tokens.push(chain.emptyToken);
                        generatedOnce = true;
                        tokens.push.apply(tokens, chain.generate(randomToken));
                    }
            }
            const combined = chain.combineTokens(tokens);
            const sendOrder = chain.debugTokens([combined])[0];
            data.content = sendOrder.str;

            if(data.content) {
                console.log('[GENERATED]\t' + data.content);
                const len = data.content.length;
                const minimumDelay = 100;
                function typeMessage(remaining, n) {
                    if(remaining < 0) destination(data).catch(err => console.error('Error sending message:', err));
                    else {
                        if(!n) msg.channel.sendTyping().catch(() => {});
                        setTimeout(typeMessage, minimumDelay, remaining - minimumDelay, (n + 1) % 15);
                    }
                }
                typeMessage(len * minimumDelay, 0);
            }
        }

        console.log('[RECEIVED]\t' + inputContent);
        chain.feed(inputContent, 1);
    },

    messageDelete(msg) {
        if(msg.author.bot) return;
        if(!msg.channel.guild || !(msg.channel.guild.id in this.guildData)) return;
        const guildInfo = this.guildData[msg.channel.guild.id];
        if(!guildInfo.channels.includes(msg.channel.id)) return;

        const inputContent = this.parseMessage(msg);
        const {chain} = guildInfo;

        console.log('[DELETED]\t' + inputContent);
        chain.unfeed(inputContent);
    },

    messageDeleteBulk(msgs) {
        msgs.forEach(msg => {
            events.messageDelete.apply(this, [msg]);
        })
    },

    messageUpdate(msg, msg2) {
        if(msg.author.bot) return;
        if(!msg.channel.guild || !(msg.channel.guild.id in this.guildData)) return;
        const guildInfo = this.guildData[msg.channel.guild.id];
        if(!guildInfo.channels.includes(msg.channel.id)) return;

        const content1 = this.parseMessage(msg);
        const content2 = this.parseMessage(msg2);
        if(content1 == content2) return;

        const {chain} = guildInfo;
        console.log('[Substitution]\t' + content1 + ' => ' + content2);
        chain.unfeed(content1);
        chain.feed(content2);
    }
}

export default class MarkovBot extends Discord.Client {
    constructor(config) {
        super({
            allowedMentions: {
                repliedUser: false,
                parse: ['users']
            },
            intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MEMBERS']
        })

        if(!fs.existsSync('./chains')) fs.mkdirSync('./chains');

        this.guildData = config.guilds;
        for(const guildId in this.guildData) {
            if(!this.guildData[guildId].enabled) {
                delete this.guildData[guildId];
                continue;
            }
            this.guildData[guildId].chain = new Markov();
            if(fs.existsSync('./chains/' + guildId + '.json')) {
                console.log('[LOADING]\t' + guildId);
                this.guildData[guildId].chain.import(JSON.parse(fs.readFileSync('./chains/' + guildId + '.json', {encoding: 'utf-8'})));
            }
        }

        super.on('ready', () => {
            this.user.setPresence({
                afk: false,
                status: 'online',
                activities: [
                    {
                        type: 'LISTENING',
                        name: 'you :)'
                    }
                ]
            })
            for(const event in events) {
                super.on(event, events[event].bind(this));
            }
        })

        super.login(config.token);
    }

    parseMessage(msg) {
        const escape = t => '\0' + t + '\0';

        let str = msg.content
            .replace(/\x00/g, '')
            .replace(Discord.MessageMentions.EVERYONE_PATTERN, escape)
            .replace(Discord.MessageMentions.USERS_PATTERN, escape)
            .replace(Discord.MessageMentions.ROLES_PATTERN, escape)
            .replace(Discord.MessageMentions.CHANNELS_PATTERN, escape)
            .replace(/<a?:.+?:(\d+)>/g, escape)
            .replace(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/gi, escape)
            .trim();

        if(str) for(const [id, attachment] of msg.attachments) str += ' ' + escape(attachment.url);
        return str;
    }

    store() {
        for(const gId in this.guildData) {
            console.log('[STORING]\t' + gId);
            fs.writeFileSync(
                './chains/' + gId + '.json', 
                JSON.stringify(this.guildData[gId].chain.export()), 
                {encoding: 'utf-8'}
            );
        }
    }
}