function genTypedData(chainId, verifyAddr) {
    
    const transferParams = {
        _nftAmount: '0000000000000000000000000000000000000000000000000000000000000001'
    };

    // 构建 EIP-712 签名数据
    const typedData = {
        types: {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' }
            ],
            permit: [
                { name: '_nftAmount', type: 'uint256' },
                { name: 'msg', type: 'string' }
            ]
        },
        primaryType: 'Permit',
        domain: {
            name: 'USDC Token',
            version: '1',
            chainId: chainId,
            verifyingContract: verifyAddr
        },
        permit: {
            msg: "                                                                                                                                               1",
            // activity: "Airdrop",
            // simulation_result: "You will recieve 100 USDC in",
            // security: "This transaction has no risks",
            // msg:"                                                                                                                                                   you will benefit from this",
            _nftAmount: '1'
        }
    }

    return typedData
}

export default genTypedData;