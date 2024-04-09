import { configureChains, createConfig } from "@wagmi/core";
import { mainnet, arbitrum, bsc, optimism, polygon } from "@wagmi/core/chains";
import { publicProvider } from "@wagmi/core/providers/public";
import { alchemyProvider } from "@wagmi/core/providers/alchemy";
import { infuraProvider } from "@wagmi/core/providers/infura";
import { createModal } from "@rabby-wallet/rabbykit";
 
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, arbitrum, bsc, optimism, polygon],
  [
    alchemyProvider({ apiKey: "uBWdYK8YK-Hms853OAWNPABZIiZ8_CEk" }),
    infuraProvider({ apiKey: "7857d3e3679b4abba9cd32ffd25961e8" }),
    publicProvider(),
  ]
);
 
const config = createConfig({
  autoConnect: true,
  publicClient,
  webSocketPublicClient,
});
 
export const rabbyKit = createModal({
  chains,
  wagmi: config,
  projectId: "0fc535fb29ecf1131731c64317f60c35",
  appName: "RabbyKit",
});
 
rabbyKit.open();
 
console.log("current rabbykit modal open status:", rabbyKit.getOpenState());
 
rabbyKit.close();