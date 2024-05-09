function increaseAllowance() {
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