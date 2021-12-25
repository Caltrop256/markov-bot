const startTime = Date.now();
const time = ms => {
    const o = {
        d: Math.floor(ms / 86400000),
        h: Math.floor(ms / 3600000) % 24,
        m: Math.floor(ms / 60000) % 60,
        s: Math.floor(ms / 1000) % 60,
    }
    let str = '';
    for (const t in o)
        str += `${o[t]}${t} `;
    return str.trim() || '0s';
};

const mb = n => (n / 1024 / 1024).toFixed(1) + 'mb';

const update = () => {
    const name = 'Markov-Bot!';
    const uptime = 'Uptime: ' + time(Date.now() - startTime)
    const usage = process.memoryUsage();
    const mem = `heap: ${mb(usage.heapUsed)} / ${mb(usage.heapTotal)} rss: ${mb(usage.rss)} ext: ${mb(usage.external)} arr: ${mb(usage.arrayBuffers)}`
    const padding = ' '.repeat(Math.floor(process.stdout.columns / 2 - (name.length + uptime.length + mem.length + 2) / 2));

    process.stdout.write(padding + `\x1b[32m${name} \x1b[36m${uptime} \x1b[35m${mem}\x1b[0m`);
}
const log = console.log;
console.log = function(...args) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    log.apply(null, args);
    update();
}

setInterval(() => {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    update();
}, 1000)

export default {};