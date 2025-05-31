import { Wallet } from 'starknetkit';

async function connectWallet() {
    const wallet = new Wallet();
    try {
        const account = await wallet.connect();
        document.getElementById('status').innerText = 'Wallet connected: ' + account;
        return wallet;
    } catch (error) {
        document.getElementById('status').innerText = 'Failed to connect wallet: ' + error.message;
        throw error;
    }
}

async function signMessage(wallet) {
    const message = 'Hello, Argent X!';
    try {
        const signature = await wallet.signMessage(message);
        document.getElementById('status').innerText = 'Message signed: ' + signature;
    } catch (error) {
        document.getElementById('status').innerText = 'Failed to sign message: ' + error.message;
    }
}

document.getElementById('connectButton').addEventListener('click', async () => {
    const wallet = await connectWallet();
    document.getElementById('signMessageButton').disabled = false;
    document.getElementById('signMessageButton').addEventListener('click', () => signMessage(wallet));
});
