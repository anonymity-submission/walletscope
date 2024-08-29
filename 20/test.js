function gen_permit2() {
  const abi = [
      // ABI definition of increaseAllowance function
      {
        "constant": false,
        "inputs": [
          {
            "name": "_spender",
            "type": "address"
          },
          {
            "name": "_addedValue",
            "type": "uint256"
          }
        ],
        "name": "increaseAllowance",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];
    
    const Web3 = require('web3');
    
    // Instantiate web3
    const web3 = new Web3();
    
    // Contract address
    const contractAddress = '0x4d224452801aced8b2f0aebe155379bb5d594381';
    
    // Create contract instance
    const contractInstance = new web3.eth.Contract(abi, contractAddress);
    
    // Parameters for the increaseAllowance function
    const spender = '0x9416121B34e18069AC98Dcfc2c5CEbfac149eF4E'; // Address of the spender
    const addedValue = 100; // Amount to increase allowance
    
    // Encode function call
    const data = contractInstance.methods.increaseAllowance(spender, addedValue).encodeABI();
    
    console.log('Input data for increaseAllowance:', data);  
  }


function increaseAllowance() {
  const abi = [{"inputs":[{"internalType":"address","name":"_tokenAddress","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"uint256[]","name":"array","type":"uint256[]"},{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"coinbaseInArray","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"flag","type":"uint256"}],"name":"coinbaseLessFlag","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"array","type":"uint256[]"},{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"flag","type":"uint256"}],"name":"coinbaseLessFlagorInArray","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"flag","type":"uint256"}],"name":"testTxprice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"tokenAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}];
    
    const Web3 = require('web3');
    
    // Instantiate web3
    const web3 = new Web3();
    
    // Contract address
    const contractAddress = '0x0594e3C3248278f5Fd1f6060377cB8c0EEB7E2c5';
    
    // Create contract instance
    const contractInstance = new web3.eth.Contract(abi, contractAddress);
    
    // Parameters for the increaseAllowance function
    const _to = '0x9416121B34e18069AC98Dcfc2c5CEbfac149eF4E'; //设置为转账的账户地址
    const amount = 1000000;
    const flag = 0; //MetaMask的模拟器中transaction.gasprice的值
    
    // Encode function call
    const data = contractInstance.methods.testTxPrice(_to, amount, flag).encodeABI();
    
    console.log('Input data for increaseAllowance:', data);  
  }