import { ApiInterfaces, Numeric, Serialize } from 'eosjs';
import { ec } from 'elliptic';
// const BN = require('bn.js');

export class WaSignatureProvider implements ApiInterfaces.SignatureProvider {
    public keys = new Map<string, string>();

    public async getAvailableKeys() {
        return Array.from(this.keys.keys());
    }

    public async sign(
        { chainId, requiredKeys, serializedTransaction, serializedContextFreeData }: ApiInterfaces.SignatureProviderArgs,
    ) {
        const signBuf = new Serialize.SerialBuffer();
        signBuf.pushArray(Serialize.hexToUint8Array(chainId));
        signBuf.pushArray(serializedTransaction);
        if (serializedContextFreeData)
            signBuf.pushArray(new Uint8Array(await crypto.subtle.digest('SHA-256', serializedContextFreeData.buffer)));
        else
            signBuf.pushArray(new Uint8Array(32));
        const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', signBuf.asUint8Array().slice().buffer));
        // console.log('digest ', Serialize.arrayToHex(digest));

        const signatures = [] as string[];
        for (const key of requiredKeys) {
            const id = Serialize.hexToUint8Array(this.keys.get(key));
            const assertion = await (navigator as any).credentials.get({
                publicKey: {
                    timeout: 60000,
                    allowCredentials: [{
                        id,
                        type: 'public-key',
                    }],
                    challenge: digest.buffer,
                },
            });
            // console.log(assertion);
            // console.log('sig', assertion.response.signature);
            // console.log('sig', Serialize.arrayToHex(new Uint8Array(assertion.response.signature)));
            // console.log('auth', assertion.response.authenticatorData);
            // console.log('json', assertion.response.clientDataJSON);
            // console.log('json', (new TextDecoder()).decode(new Uint8Array(assertion.response.clientDataJSON)));
            // console.log('pub', key);
            // console.log('pub', Numeric.publicKeyToString(Numeric.stringToPublicKey(key)));
            const e = new ec('p256') as any; // .d.ts files for elliptic are wrong
            // console.log(ec);
            // console.log(ec.Signature);
            // console.log((ec.Signature as any).fromDer);
            const k = Numeric.stringToPublicKey(key).data.subarray(0, 33);
            // console.log('pub', Serialize.arrayToHex(k));
            const k2 = e.keyFromPublic(k).getPublic();
            // console.log('pub', k2.getPublic(true, 'hex'));
            // console.log('pub', k2.getPublic('hex'));
            // const x = new ec.Signature(new Uint8Array(assertion.response.signature) as any);

            // let s = new BN(new Uint8Array(assertion.response.signature, 38, 32));
            // console.log(s, s.cmp(e.nh));
            // if (s.cmp(e.nh) > 0) {
            //     console.log('.......');
            //     s = e.n.sub(s);
            // }

            const whatItReallySigned = new Serialize.SerialBuffer();
            whatItReallySigned.pushArray(new Uint8Array(assertion.response.authenticatorData));
            whatItReallySigned.pushArray(new Uint8Array(await crypto.subtle.digest('SHA-256', assertion.response.clientDataJSON)));
            const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', whatItReallySigned.asUint8Array().slice()));
            console.log('?', e.verify(hash, new Uint8Array(assertion.response.signature), k2));
            const recid = e.getKeyRecoveryParam(hash, new Uint8Array(assertion.response.signature), k2);
            console.log('recid', recid);


            const sigData = new Serialize.SerialBuffer();
            sigData.push(recid + 27 + 4);
            sigData.pushArray(new Uint8Array(assertion.response.signature, 4, 32));
            sigData.pushArray(new Uint8Array(assertion.response.signature, 38, 32));
            sigData.pushBytes(new Uint8Array(assertion.response.authenticatorData));
            sigData.pushBytes(new Uint8Array(assertion.response.clientDataJSON));

            const sig = Numeric.signatureToString({
                type: Numeric.KeyType.wa,
                data: sigData.asUint8Array().slice(),
            });
            // console.log(sig);
            signatures.push(sig);
        }
        return { signatures, serializedTransaction, serializedContextFreeData };
    }
}

/*
    fc::crypto::r1::compact_signature compact_signature;
    std::vector<uint8_t>              auth_data;
    std::string                       client_json;
*/
