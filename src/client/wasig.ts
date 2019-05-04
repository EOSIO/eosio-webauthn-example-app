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
        const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', signBuf.asUint8Array().slice().buffer));

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
            const e = new ec('p256') as any;
            const pubKey = e.keyFromPublic(Numeric.stringToPublicKey(key).data.subarray(0, 33)).getPublic();

            function fixup(x: Uint8Array) {
                const a = Array.from(x);
                while (a.length < 32)
                    a.unshift(0);
                while (a.length > 32)
                    if (a.shift() !== 0)
                        throw new Error('Signature has an r or s that is too big');
                return new Uint8Array(a);
            }

            const der = new Serialize.SerialBuffer({ array: new Uint8Array(assertion.response.signature) });
            if (der.get() !== 0x30)
                throw new Error('Signature missing DER prefix');
            if (der.get() !== der.array.length - 2)
                throw new Error('Signature has bad length');
            if (der.get() !== 0x02)
                throw new Error('Signature has bad r marker');
            const r = fixup(der.getUint8Array(der.get()));
            if (der.get() !== 0x02)
                throw new Error('Signature has bad s marker');
            const s = fixup(der.getUint8Array(der.get()));

            const whatItReallySigned = new Serialize.SerialBuffer();
            whatItReallySigned.pushArray(new Uint8Array(assertion.response.authenticatorData));
            whatItReallySigned.pushArray(new Uint8Array(await crypto.subtle.digest('SHA-256', assertion.response.clientDataJSON)));
            const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', whatItReallySigned.asUint8Array().slice()));
            const recid = e.getKeyRecoveryParam(hash, new Uint8Array(assertion.response.signature), pubKey);

            const sigData = new Serialize.SerialBuffer();
            sigData.push(recid + 27 + 4);
            sigData.pushArray(r);
            sigData.pushArray(s);
            sigData.pushBytes(new Uint8Array(assertion.response.authenticatorData));
            sigData.pushBytes(new Uint8Array(assertion.response.clientDataJSON));

            const sig = Numeric.signatureToString({
                type: Numeric.KeyType.wa,
                data: sigData.asUint8Array().slice(),
            });
            signatures.push(sig);
        }
        return { signatures, serializedTransaction, serializedContextFreeData };
    }
}
