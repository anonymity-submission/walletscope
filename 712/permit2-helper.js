const { Permit2 } = require ("permit2-helper")


const permit2Helper = new Permit2({
	signer: '0x7858ABd0c344F6564932afd8417950FC35Dfdf81',
	domainOpt: { chaindId: 1, verifyingContract: '0x7858ABd0c344F6564932afd8417950FC35Dfdf81' },
});

const params =  {
    permitted: {
        token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        amount: 123456789
    },
    spender: '0x9416121B34e18069AC98Dcfc2c5CEbfac149eF4E',
    nonce: 123,
    deadline: 123456789,
}

const signature = permit2Helper.signPermitTransferFrom(params);
console.log(signature)