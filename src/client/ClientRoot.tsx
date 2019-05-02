import { Key } from '../common/Key';
import { Api, JsonRpc, Serialize } from 'eosjs';
import { WaSignatureProvider } from './wasig';
import * as IoClient from 'socket.io-client';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

require('./style.css');

const socketUrl = 'http://localhost:8000';

class AppState {
    public alive = true;
    public io: SocketIOClient.Socket;
    public clientRoot: ClientRoot;
    public keys = [] as Key[];
    public sigprov = new WaSignatureProvider();
    public rpc = new JsonRpc('http://localhost:8888');
    public api: Api;
    public message = '';

    constructor() {
        this.api = new Api({ rpc: this.rpc, signatureProvider: this.sigprov });
    }

    public restore(prev: AppState) {
        this.message = prev.message;
        this.setKeys(prev.keys);
    }

    public setKeys(keys: Key[]) {
        this.keys = keys;
        this.sigprov.keys.clear();
        for (const key of this.keys)
            this.sigprov.keys.set(key.key, key.credentialId);
    }
}

function appendMessage(appState: AppState, message: string) {
    appState.message += message + '\n';
    appState.clientRoot.forceUpdate();
}

function connectSocket(appState: AppState) {
    appState.io = IoClient(socketUrl);
    appState.io.on('reconnect', () => {
        appState.io.close();
        if (appState.alive)
            connectSocket(appState);
    });
    appState.io.on('err', (error: string) => {
        appendMessage(appState, error);
    });
    appState.io.on('keys', (keys: any) => {
        appState.setKeys(keys);
        appState.clientRoot.forceUpdate();
    });
}

async function createKey(appState: AppState) {
    try {
        appendMessage(appState, 'Create key...');
        let rp = { id: 'localhost', name: 'bar' };
        let cred = await (navigator as any).credentials.create({
            publicKey: {
                rp,
                user: {
                    id: new Uint8Array(16),
                    name: 'john.p.smith@example.com',
                    displayName: 'John P. Smith',
                },
                pubKeyCredParams: [{
                    type: 'public-key',
                    alg: -7,
                }],
                timeout: 60000,
                challenge: new Uint8Array([
                    0x8C, 0x0A, 0x26, 0xFF, 0x22, 0x91, 0xC1, 0xE9, 0xB9, 0x4E, 0x2E, 0x17, 0x1A, 0x98, 0x6A, 0x73,
                    0x71, 0x9D, 0x43, 0x48, 0xD5, 0xA7, 0x6A, 0x15, 0x7E, 0x38, 0x94, 0x52, 0x77, 0x97, 0x0F, 0xEF,
                ]).buffer,
            },
        });
        console.log(cred);
        appState.io.emit('addKey', {
            rpid: rp.id,
            id: Serialize.arrayToHex(new Uint8Array(cred.rawId)),
            attestationObject: Serialize.arrayToHex(new Uint8Array(cred.response.attestationObject)),
            clientDataJSON: Serialize.arrayToHex(new Uint8Array(cred.response.clientDataJSON)),
        });
    } catch (e) {
        appendMessage(appState, e);
    }
}

async function transfer(appState: AppState, from: string, to: string) {
    try {
        await appState.api.transact(
            {
                actions: [{
                    account: 'eosio.token',
                    name: 'transfer',
                    data: {
                        from,
                        to,
                        quantity: '0.0001 SYS',
                        memo: '',
                    },
                    authorization: [{
                        actor: from,
                        permission: 'active',
                    }],
                }],
            }, {
                blocksBehind: 3,
                expireSeconds: 10,
            });
        appendMessage(appState, 'transaction pushed');
    } catch (e) {
        appendMessage(appState, e);
    }
}

function Controls({ appState }: { appState: AppState }) {
    return (
        <div className='control'>
            <button onClick={() => { createKey(appState); }}>Create Key</button>
            <button onClick={() => { transfer(appState, 'usera', 'userb'); }}>usera -> userb</button>
        </div>
    );
}

class ClientRoot extends React.Component<{ appState: AppState }> {
    public render() {
        const { appState } = this.props;
        appState.clientRoot = this;
        return (
            <div className='client-root'>
                <Controls appState={appState} />
                <pre className='keys'>{'Keys:\n' + appState.keys.map(k => k.key).join('\n')}</pre>
                <pre className='message'>{'Messages:\n' + appState.message}</pre>
            </div>
        );
    }
}

export default function init(prev: AppState) {
    let appState = new AppState();
    if (prev) {
        appState.restore(prev);
        prev.alive = false;
        if (prev.io)
            prev.io.close();
    }
    connectSocket(appState);
    ReactDOM.render(<ClientRoot {...{ appState }} />, document.getElementById('main'));
    return appState;
}
