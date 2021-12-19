import MarkovBot from './bot.js';
import { createRequire } from 'module';
const config = createRequire(import.meta.url)('./config.json');

const client = new MarkovBot(config);

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => {
    client.store();
    process.exit(0);
});

setInterval(() => client.store(), 60000 * 10);