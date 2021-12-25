import Markov from './chain.js';
import fs from 'fs';
import DiscordClient from './client/client.js';

export default class MarkovDiscordBot extends DiscordClient {
    constructor(config) {
        super(config);

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
            this.guildData[guildId].messageCache = new Map();
        }

        super.on('ready', () => {
            for(const event of fs.readdirSync('./events')) {
                this.ws.on(
                    event.split('.js')[0], 
                    new Function(fs.readFileSync('./events/' + event)).bind(this)
                )
            }
        })
    }

    parseMessage(msg) {
        const escape = t => '\0' + t + '\0';

        let str = msg.content
            .replace(/\x00/g, '')
            .replace(/@(everyone|here|someone)/g, escape)
            .replace(/<@!?(\d{17,19})>/g, escape)
            .replace(/<@&(\d{17,19})>/g, escape)
            .replace(/<#(\d{17,19})>/g, escape)
            .replace(/<a?:.+?:\d{17,19}>/g, escape)
            .replace(/(https?|ftp):\/\/[^\s/$.?#].[^\s]*/gi, escape)
            .trim();

        if(str.length) for(const attachment of msg.attachments) str += ' ' + escape(attachment.url);
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