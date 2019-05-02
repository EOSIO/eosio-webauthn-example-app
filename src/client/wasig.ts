import { ApiInterfaces, Numeric, Serialize } from 'eosjs';
import { ec } from 'elliptic';

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
        const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', signBuf.asUint8Array().buffer));

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
                    challenge: hash.buffer,
                },
            });
            console.log(assertion);
            console.log('sig', assertion.response.signature);
            console.log('sig', Serialize.arrayToHex(new Uint8Array(assertion.response.signature)));
            console.log('auth', assertion.response.authenticatorData);
            console.log('json', assertion.response.clientDataJSON);
            console.log('pub', key);
            console.log('pub', Numeric.publicKeyToString(Numeric.stringToPublicKey(key)));
            const e = new ec('p256') as any; // .d.ts files for elliptic are wrong
            // console.log(ec);
            // console.log(ec.Signature);
            // console.log((ec.Signature as any).fromDer);
            const k = Numeric.stringToPublicKey(key).data.subarray(0, 33);
            console.log('pub', Serialize.arrayToHex(k));
            // console.log(xxx);
            const k2 = e.keyFromPublic(k);
            console.log('pub', k2.getPublic(true, 'hex'));
            console.log('pub', k2.getPublic('hex'));
            // const x = new ec.Signature(new Uint8Array(assertion.response.signature) as any);

            debugger
            const whatItReallySigned = new Serialize.SerialBuffer();
            whatItReallySigned.pushArray(new Uint8Array(assertion.response.authenticatorData));
            whatItReallySigned.pushArray(new Uint8Array(await crypto.subtle.digest('SHA-256', assertion.response.clientDataJSON)));
            const s = new Uint8Array(await crypto.subtle.digest('SHA-256', whatItReallySigned.asUint8Array()));
            console.log('s', s);
            const recid = e.getKeyRecoveryParam(s, new Uint8Array(assertion.response.signature), k2);
            console.log('recid', recid);
        }
        return { signatures, serializedTransaction, serializedContextFreeData };
    }
}

/*
    fc::crypto::r1::compact_signature compact_signature;
    std::vector<uint8_t>              auth_data;
    std::string                       client_json;
*/
