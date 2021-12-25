import HTTPAPI from "./http.js";
import WSAPI from "./ws.js";
import EventEmitter from "events";

export default class DiscordClient extends EventEmitter {
    constructor(config) {
        super();
        this.http = new HTTPAPI(config.token, 8);
        this.http.get('/gateway').then(data => {
            this.ws = new WSAPI(config.token, data.url);
            this.ws.on('READY', () => this.emit('ready'));
        });
    }
};