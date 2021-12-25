import MarkovDiscordBot from "./bot.js";
import { createRequire } from 'module';
import _ from './log.js';

const config = createRequire(import.meta.url)('./config.json');

const client = new MarkovDiscordBot(config);
client.on('ready', () => {

});

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => {
    console.log();
    client.store();
    process.stdout.write('\n');
    process.exit(0);
});

setInterval(() => client.store(), 60000 * 10);