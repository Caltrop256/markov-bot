import https from 'https';

export default class HTTPAPI {
    opts = {
        hostname: 'discord.com',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36',
            'Authorization': null,
            'Content-Type': 'application/json'
        }
    }
    version = '/api/v';

    constructor(token, apiVersion) {
        this.opts.headers['Authorization'] = token;
        if(token.startsWith('Bot ')) delete this.opts.headers['User-Agent'];
        this.version += apiVersion;
    }

    _readBody(res) {
        return new Promise((resolve, reject) => {
            const len = Number(res.headers['Content-Length'] || res.headers['content-length']);
            if(len == len) {
                const buf = Buffer.alloc(len);
                let bufInd = 0;
                res.on('data', inc => {
                    for(let i = 0; i < inc.byteLength; ++i) {
                        buf[bufInd++] = inc[i];
                    }
                    if(bufInd >= buf.byteLength) resolve(buf);
                });
                res.on('end', () => resolve(buf));
                res.on('error', reject);
            } else {
                const rec = [];
                res.on('data', inc => rec.push(inc));
                res.on('end', () => resolve(Buffer.concat(rec)));
                res.on('error', reject);
            }
        });
    }

    get(path) {
        return new Promise((resolve, reject) => {
            const options = Object.assign({
                path: this.version + path
            }, this.opts);
            const req = https.get(options, res => {
                this._readBody(res).then(buf => {
                    switch(res.headers['content-type']) {
                        case 'application/json' :
                            resolve(JSON.parse(buf.toString('utf-8')));
                            break;
                        default : 
                            console.log(options);
                            console.log(buf.toString('utf-8'));
                            reject(new TypeError('Returned ' + res.headers['content-type']));
                    }
                })
            });
            req.on('error', reject);
        })
    }

    _send(method, path, data) {
        return new Promise((resolve, reject) => {
            const options = Object.assign({
                path: this.version + path,
                method
            }, this.opts);
            const req = https.request(options, res => {
                this._readBody(res).then(buf => {
                    switch(res.headers['content-type']) {
                        case 'application/json' :
                            resolve(JSON.parse(buf.toString('utf-8')));
                            break;
                        default : 
                            if(res.statusCode != 204) reject(new TypeError('Returned ' + res.headers['content-type']));
                            break;
                    }
                })
            });
            req.on('error', reject);
            if(data) req.write(JSON.stringify(data));
            req.end();
        })
    }

    post(path, data) {
        return this._send('POST', path, data);
    }

    patch(path, data) {
        return this._send('PATCH', path, data);
    }
}