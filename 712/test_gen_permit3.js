// 引入所需的库和模块
const { ethers } = require('ethers');
const { AllowanceProvider, MaxAllowanceTransferAmount, PermitSingle, AllowanceTransfer } = require('@uniswap/Permit2-sdk');
const { eth } = require('web3');

// 定义一些必要的参数
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'; // 替换为你的 Permit2 合约地址
const USER_ADDRESS = '0x7858ABd0c344F6564932afd8417950FC35Dfdf81'; // 替换为用户的地址
const TOKEN_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // 替换为 token 的地址
const ROUTER_ADDRESS = '0xRouterAddress'; // 替换为 router 的地址
const SPENDER_ADDRESS = '0x9416121B34e18069AC98Dcfc2c5CEbfac149eF4E'; // 替换为 spender 的地址
const CHAIN_ID = 1; // 替换为你的链 ID

// 初始化 ethers provider
const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/fefe1ae95718497b9a570edc0f3f5bcb'); // 替换为你的 Infura 节点地址

async function getSignature() {
    try {
        // 创建 AllowanceProvider 对象
        // const allowanceProvider = new AllowanceProvider(provider, PERMIT2_ADDRESS);

        // 获取下一个有效的 nonce
        // const { amount: permitAmount, expiration, nonce } = allowanceProvider.getAllowanceData(USER_ADDRESS, TOKEN_ADDRESS, ROUTER_ADDRESS);
        const nonce  = 0
        // 构建 PermitSingle 对象
        const permitSingle = {
            details: {
                token: TOKEN_ADDRESS,
                amount: MaxAllowanceTransferAmount,
                expiration: toDeadline(1000 * 60 * 60 * 24 * 30), // 30 天的时间戳
                nonce,
            },
            spender: SPENDER_ADDRESS,
            sigDeadline: toDeadline(1000 * 60 * 30), // 30 分钟的时间戳
        };

        // 获取签名所需的数据
        const { domain, types, values } = AllowanceTransfer.getPermitData(permitSingle, PERMIT2_ADDRESS, CHAIN_ID);
        // const all = AllowanceTransfer.getPermitData(permitSingle, PERMIT2_ADDRESS, CHAIN_ID);
        // console.log("domain:", domain, "types:", types, "values: ", values)
        // 使用 ethers 签名器进行签名
        // const t = await provider.getSigner()
        const signature = await provider.getSigner().signTypedData(domain, types, values);

        console.log('Signature:', signature);
    } catch (error) {
        console.error('Error:', error);
    }
}

// 辅助函数：将毫秒数转换为秒数
function toDeadline(expiration) {
    return Math.floor((Date.now() + expiration) / 1000);
}

// 调用函数获取签名
getSignature();
