import { ApiInterfaces, Serialize } from 'eosjs';

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
        return { signatures, serializedTransaction, serializedContextFreeData };
    }
}
