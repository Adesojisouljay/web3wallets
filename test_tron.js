import { TronWeb } from "tronweb";

const tronWeb = new TronWeb({
    fullHost: "https://api.trongrid.io",
});

async function testTron() {
    const address = "TR7NHqjk2jtZmt6GW1Rtc3MKvbnyo6nvve"; // Tether contract address as a test account
    try {
        console.log(`Checking balance for: ${address}`);
        const balance = await tronWeb.trx.getBalance(address);
        console.log(`Balance (Sun): ${balance}`);
        console.log(`Balance (TRX): ${balance / 1e6}`);
    } catch (err) {
        console.error("Tron Error:", err.message);
    }
}

testTron();
