const algosdk = require('algosdk');
const { getAlgodClient, getIndexerClient, getAlgorandHealth } = require('../config/algorand');

// @GET /api/algorand/health
exports.getHealth = async (req, res, next) => {
  try {
    const health = await getAlgorandHealth();
    res.json({ success: true, algorand: health });
  } catch (error) {
    next(error);
  }
};

// @GET /api/algorand/account/:address
exports.getAccountInfo = async (req, res, next) => {
  try {
    const { address } = req.params;
    if (!algosdk.isValidAddress(address)) {
      return res.status(400).json({ success: false, message: 'Invalid Algorand address' });
    }

    const client = getAlgodClient();
    const accountInfo = await client.accountInformation(address).do();

    res.json({
      success: true,
      account: {
        address,
        balance: accountInfo.amount / 1e6, // microALGO to ALGO
        minBalance: accountInfo['min-balance'] / 1e6,
        totalAppsOptedIn: accountInfo['total-apps-opted-in'],
        totalAssetsOptedIn: accountInfo['total-assets-opted-in'],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @GET /api/algorand/tx/:txId
exports.getTransaction = async (req, res, next) => {
  try {
    const indexer = getIndexerClient();
    const tx = await indexer.lookupTransactionByID(req.params.txId).do();
    res.json({ success: true, transaction: tx.transaction });
  } catch (error) {
    next(error);
  }
};

// @POST /api/algorand/create-wallet
exports.createWallet = async (req, res, next) => {
  try {
    const account = algosdk.generateAccount();
    const mnemonic = algosdk.secretKeyToMnemonic(account.sk);

    // SECURITY: In production, NEVER return the mnemonic — show it once and require user to save it.
    res.json({
      success: true,
      wallet: {
        address: account.addr,
        mnemonic, // Show once to user, then discard
      },
      warning: 'Save your mnemonic securely. This is shown only once.',
    });
  } catch (error) {
    next(error);
  }
};

// @GET /api/algorand/params
exports.getSuggestedParams = async (req, res, next) => {
  try {
    const client = getAlgodClient();
    const params = await client.getTransactionParams().do();
    res.json({ success: true, params });
  } catch (error) {
    next(error);
  }
};

// @POST /api/algorand/verify-tx
// Verify a transaction exists on-chain and matches expected amount
exports.verifyTransaction = async (req, res, next) => {
  try {
    const { txId, expectedAmount, expectedReceiver } = req.body;
    const indexer = getIndexerClient();
    const txInfo = await indexer.lookupTransactionByID(txId).do();
    const tx = txInfo.transaction;

    const amountMatch = !expectedAmount || tx['payment-transaction']?.amount === Math.round(expectedAmount * 1e6);
    const receiverMatch = !expectedReceiver || tx['payment-transaction']?.receiver === expectedReceiver;

    res.json({
      success: true,
      verified: amountMatch && receiverMatch,
      transaction: {
        id: tx.id,
        amount: (tx['payment-transaction']?.amount || 0) / 1e6,
        receiver: tx['payment-transaction']?.receiver,
        sender: tx.sender,
        confirmedRound: tx['confirmed-round'],
      },
    });
  } catch (error) {
    next(error);
  }
};
