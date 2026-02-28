const algosdk = require('algosdk');

let algodClient = null;
let indexerClient = null;

const getAlgodClient = () => {
  if (!algodClient) {
    algodClient = new algosdk.Algodv2(
      process.env.ALGORAND_TOKEN,
      process.env.ALGORAND_SERVER,
      process.env.ALGORAND_PORT
    );
  }
  return algodClient;
};

const getIndexerClient = () => {
  if (!indexerClient) {
    indexerClient = new algosdk.Indexer(
      process.env.ALGORAND_TOKEN,
      process.env.ALGORAND_INDEXER,
      process.env.ALGORAND_PORT
    );
  }
  return indexerClient;
};

const getAlgorandHealth = async () => {
  try {
    const client = getAlgodClient();
    const status = await client.status().do();
    return { healthy: true, lastRound: status['last-round'] };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
};

module.exports = { getAlgodClient, getIndexerClient, getAlgorandHealth };
