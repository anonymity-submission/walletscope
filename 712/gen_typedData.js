function genTypedData(chainId, verifyAddr) {
    // const response = fetch('./publicMint.json');
    // const contractABI = response.json();
    // const contract = new web3.eth.Contract(contractABI ,contractAddress);

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
            Permit: [
                { name: '_nftAmount', type: 'uint256' }
            ]
        },
        primaryType: 'Permit',
        domain: {
            name: 'EIP-2612 Token',
            version: '1',
            chainId: chainId,
            verifyingContract: verifyAddr
        },
        message: {
            _nftAmount: transferParams._nftAmount
        }
    }

    return typedData
}

export default genTypedData;