import { connect, disconnect } from "starknetkit";

const connectWallet = async () => {
    const connection = await connect({ webWalletUrl: "https://web.argent.xyz" });
  
    if (connection && connection.isConnected) {
      setConnection(connection);
      setProvider(connection.account);
      setAddress(connection.selectedAddress);
    }
  };
  
  const tx = await connection.account.execute({
    //let's assume this is an erc20 contract
    contractAddress: "0x...",
    selector: "transfer",
    calldata: [
      "0x...",
      // ...
    ],
  });
  