import * as IoClient from 'socket.io-client';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Serialize from '../external/eosjs/src/eosjs-serialize';

require('./style.css');

const socketUrl = 'http://localhost:8000';

class AppState {
    public alive = true;
    public io: SocketIOClient.Socket;
    public clientRoot: ClientRoot;
    public message = '';
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
}

async function createKey(appState: AppState) {
    try {
        appendMessage(appState, 'Create key...');
        let cred = await (navigator as any).credentials.create({
            publicKey: {
                rp: {
                    name: 'localhost',
                },
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
            id: Serialize.arrayToHex(new Uint8Array(cred.rawId)),
            attestationObject: Serialize.arrayToHex(new Uint8Array(cred.response.attestationObject)),
            clientDataJSON: Serialize.arrayToHex(new Uint8Array(cred.response.clientDataJSON)),
        });
    } catch (e) {
        appendMessage(appState, e);
    }
}

function Controls({ appState }: { appState: AppState }) {
    return (
        <div className='control'>
            <button onClick={() => { createKey(appState); }}>Create Key</button>
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
                <pre className='message'>{appState.message}</pre>
            </div>
        );
    }
}

export default function init(prev: AppState) {
    let appState = new AppState();
    if (prev) {
        appState = {
            ...appState,
            ...prev,
        };
        prev.alive = false;
        if (prev.io)
            prev.io.close();
    }
    connectSocket(appState);
    ReactDOM.render(<ClientRoot {...{ appState }} />, document.getElementById('main'));
    return appState;
}
