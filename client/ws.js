import WebSocket from "ws";
import EventEmitter from "events";
import constants from "./constants.js";

export default class WSAPI extends EventEmitter {
    constructor(token, gateway) {
        super();
        this.gateway = gateway;
        this.interval = null;
        this.cancelTimer = null;
        this.sequenceNum = null;
        this.sessionId = null;
        this.pingMeasureStart = Date.now();
        this.ping = Infinity;
        this.socket = new WebSocket(this.gateway);

        this.errors = [];

        this.identification = token.startsWith('Bot ')
            ? {
                token,
                intents: constants.intents.GUILD_MESSAGES,
                properties: {
                    $os: 'Linux',
                    $device: 'Markov-Bot',
                    $browser: 'Markov-Bot'
                }
            } : {
                token,
                properties: {
                    os: 'Windows',
                    os_arch: 'x86',
                    browser: 'Discord Client',
                    release_channel: 'stable',
                    device: 'Desktop' 
                }
            }

        this.socket.once('message', raw => {
            const {d} = JSON.parse(raw);
            this.heartbeatInterval = d.heartbeat_interval
            this.interval = setInterval(this.heartbeat.bind(this), this.heartbeatInterval);
            this.send(constants.opcodes.identify, this.identification);
            this.socket.on('message', this.incoming.bind(this));
        })
    }

    send(opcode, data) {
        this.socket.send(JSON.stringify({
            op: opcode,
            d: data
        }), err => {
            if(err) {
                this.errors.push(err);
                console.error(err);
            }
        })
    }

    incoming(raw) {
        const data = JSON.parse(raw);
        this.sequenceNum = data.s;

        switch(data.op) {
            case constants.opcodes.dispatch :
                if(data.t == 'READY') this.sessionId = data.d.session_id;
                this.emit(data.t, data.d);
                break;
            case constants.opcodes.acknowledged :
                clearTimeout(this.cancelTimer);
                this.ping = +(Date.now() - this.pingMeasureStart).toFixed(0);
                console.log('[HEARTBEAT]\t' + this.ping + 'ms!');
                break;
            case constants.opcodes.invalidSession :
                this.send(constants.opcodes.identify, this.identification);
                break;
            default : console.log(data);
        }
    }

    heartbeat() {
        this.cancelTimer = setTimeout(() => {
            this.reconnect();
        }, 5000);
        this.pingMeasureStart = Date.now();
        this.send(constants.opcodes.heartbeat, this.sequenceNum);
    }

    reconnect() {
        clearInterval(this.interval);
        clearTimeout(this.cancelTimer);
        console.log('reconnecting');
        this.socket.close();
        this.socket = new WebSocket(this.gateway);
        this.socket.once('message', raw => {
            const {d} = JSON.parse(raw);
            this.heartbeatInterval = d.heartbeat_interval
            this.interval = setInterval(this.heartbeat.bind(this), this.heartbeatInterval);
            this.send(constants.opcodes.resume, {
                token: this.identification.token,
                session_id: this.sessionId,
                seq: this.sequenceNum
            });
            this.socket.on('message', this.incoming.bind(this));
        })
    }
}