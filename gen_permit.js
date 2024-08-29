const { AllowanceProvider, PERMIT2_ADDRESS } = require('@uniswap/Permit2-sdk')
const {ethers} = require ('ethers')

console.log(ethers)
const ethersProvider = new ethers.InfuraProvider('https://mainnet.infura.io/v3/fefe1ae95718497b9a570edc0f3f5bcb') // 替换为你的 Infura 节点地址
console.log(ethersProvider)
const allowanceProvider = new AllowanceProvider(ethersProvider, PERMIT2_ADDRESS)
const { amount: permitAmount, expiration, nonce } = allowanceProvider.getAllowanceData(user, token, ROUTER_ADDRESS);

console.log(amount, expiration, nonce)