import { TronWeb } from "tronweb";

const tronWeb = new TronWeb({
    fullHost: "https://api.trongrid.io",
});

async function checkAddress() {
    const address = "TUgaX3eSicFKZEwK4uetSCAfnKJ56bdmey";
    try {
        console.log(`Checking balance for: ${address}`);
        const balance = await tronWeb.trx.getBalance(address);
        console.log(`Balance (Sun): ${balance}`);
        console.log(`Balance (TRX): ${balance / 1e6}`);

        const account = await tronWeb.trx.getAccount(address);
        console.log("Account Data:", JSON.stringify(account, null, 2));
    } catch (err) {
        console.error("Tron Error:", err.message);
    }
}

checkAddress();
