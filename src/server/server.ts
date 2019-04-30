import * as cbor from 'cbor';
import { Numeric, Serialize } from 'eosjs';
import * as express from 'express';
import * as fs from 'fs';
import * as SocketIO from 'socket.io';
import * as util from 'util';
import { Key } from '../common/Key';

const keysPath = 'keys.json';

let unloadedModule = false;
export const router = express.Router();

const textDecoder = new util.TextDecoder();

interface AddKeyArgs {
    id: string;
    attestationObject: string;
    clientDataJSON: string;
}

const enum AttestationFlags {
    userPresent = 0x01,
    userVerified = 0x04,
    attestedCredentialPresent = 0x40,
    extensionDataPresent = 0x80,
}

let keys = [] as Key[];
function loadKeys() {
    try {
        keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    } catch (e) {
        console.error(e.message);
        console.error('Assuming keys are empty');
    }
}

async function sendKeys() {
    socket.emit('keys', keys);
}

async function addKey(k: AddKeyArgs) {
    try {
        const decoded = await decodeKey(k);
        console.log(decoded);
        keys.push(decoded);
        fs.writeFileSync(keysPath, JSON.stringify(keys, null, 4));
        sendKeys();
    } catch (e) {
        console.log('??????', e);
        socket.emit('err', e.message);
    }
}

async function decodeKey(k: AddKeyArgs): Promise<Key> {
    // todo: check RP ID hash
    // todo: check signature
    if (unloadedModule)
        return;
    // console.log(k);
    // console.log(JSON.stringify(JSON.parse(textDecoder.decode(Serialize.hexToUint8Array(k.clientDataJSON))), null, 4));
    const att = await (cbor as any).decodeFirst(Serialize.hexToUint8Array(k.attestationObject));
    // console.log(att);
    // console.log(Serialize.arrayToHex(new Uint8Array(att.authData.buffer)));
    const data = new DataView(att.authData.buffer);
    let pos = 30;   // skip unknown
    pos += 32;      // RP ID hash
    const flags = data.getUint8(pos++);
    const signCount = data.getUint32(pos);
    pos += 4;
    if (!(flags & AttestationFlags.attestedCredentialPresent))
        throw new Error('attestedCredentialPresent flag not set');
    const aaguid = Serialize.arrayToHex(new Uint8Array(data.buffer, pos, 16));
    pos += 16;
    const credentialIdLength = data.getUint16(pos);
    pos += 2;
    const credentialId = new Uint8Array(data.buffer, pos, credentialIdLength);
    pos += credentialIdLength;
    const pubKey = await (cbor as any).decodeFirst(new Uint8Array(data.buffer, pos));
    if (Serialize.arrayToHex(credentialId) !== k.id)
        throw new Error('Credential ID does not match');
    if (pubKey.get(1) !== 2)
        throw new Error('Public key is not EC2');
    if (pubKey.get(3) !== -7)
        throw new Error('Public key is not ES256');
    if (pubKey.get(-1) !== 1)
        throw new Error('Public key has unsupported curve');
    const x = pubKey.get(-2); // todo: check length
    const y = pubKey.get(-3); // todo: check length
    if (x.length !== 32 || y.length !== 32)
        throw new Error('Public key has invalid X or Y size');
    const compact = new Uint8Array([(y[31] & 1) ? 3 : 2].concat(Array.from(x)));
    const key = Numeric.publicKeyToString({
        type: Numeric.KeyType.wa,
        data: compact,
    });
    // console.log({
    //     flags: ('00' + flags.toString(16)).slice(-2),
    //     signCount,
    //     aaguid,
    //     credentialIdLength,
    //     credentialId: Serialize.arrayToHex(credentialId),
    //     x: Serialize.arrayToHex(x),
    //     y: Serialize.arrayToHex(y),
    //     compact: Serialize.arrayToHex(compact),
    //     key,
    //     asci2: Numeric.publicKeyToString(Numeric.stringToPublicKey(key)),
    // });
    return {
        credentialId: Serialize.arrayToHex(credentialId),
        key,
        x: Serialize.arrayToHex(x), // todo: remove
        y: Serialize.arrayToHex(y), // todo: remove
    };
}

let socketIO: SocketIO.Server;
export function start(io: SocketIO.Server) {
    socketIO = io;
    loadKeys();
}

let socket: SocketIO.Socket;
export function connected(sock: SocketIO.Socket) {
    console.log('socket connected');
    sock.on('addKey', addKey);
    socket = sock;
    sendKeys();
}

export function unloading() {
    console.log('unload');
    unloadedModule = true;
}

console.log('\nLoaded server\n==================');
