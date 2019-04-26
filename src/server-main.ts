import * as cbor from 'cbor';
import * as express from 'express';
import * as SocketIO from 'socket.io';
import * as Serialize from '../external/eosjs/src/eosjs-serialize';

let unloadedModule = false;
export const router = express.Router();

interface AddKey {
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

async function addKey(k: AddKey) {
    try {
        // todo: check RP ID hash
        // todo: check signature
        if (unloadedModule)
            return;
        console.log(k);
        const att = await (cbor as any).decodeFirst(Serialize.hexToUint8Array(k.attestationObject));
        console.log(att);
        console.log(Serialize.arrayToHex(new Uint8Array(att.authData.buffer)));
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
        console.log({
            flags: ('00' + flags.toString(16)).slice(-2),
            signCount,
            aaguid,
            credentialIdLength,
            credentialId: Serialize.arrayToHex(credentialId),
            x: Serialize.arrayToHex(x),
            y: Serialize.arrayToHex(y),
        });
    } catch (e) {
        console.log('??????', e);
        socket.emit('err', e.message);
    }
}

router.get('/foo', (req: any, res: any) => {
    res.send('server main...');
});

let socketIO: SocketIO.Server;
export function start(io: SocketIO.Server) {
    socketIO = io;
}

let socket: SocketIO.Socket;
export function connected(sock: SocketIO.Socket) {
    console.log('socket connected');
    sock.on('addKey', addKey);
    socket = sock;
}

export function unloading() {
    console.log('unload');
    unloadedModule = true;
}

console.log('\nLoaded server-main\n==================');
