require('dotenv').config();
const { Signer } = require("fcl-kms-authorizer");
const { fromEnv } = require("@aws-sdk/credential-providers");

const region = "us-east-1";
const kmsKeyIds = ["cb92532b-5558-459a-b6ea-cfc18698a1e0"];

const fcl = require("@onflow/fcl");
const t = require("@onflow/types");
fcl.config()
  .put("accessNode.api", "https://testnet.onflow.org")

const rightPaddedHexBuffer = (value, pad) => {
  return Buffer.from(value.padEnd(pad * 2, 0), 'hex')
}

const USER_DOMAIN_TAG = rightPaddedHexBuffer(
  Buffer.from('FLOW-V0.0-user').toString('hex'),
  32
).toString('hex');

async function perform() {
  let originalMsg = "CHANGE_DISCORD";
  const msg = Buffer.from("CHANGE_DISCORD").toString('hex');
  console.log({msg});
  
  const signer = new Signer(
    // The first argument can be the same as the option for AWS client.
    {
      credentials: fromEnv(), // see. https://github.com/aws/aws-sdk-js-v3/tree/main/packages/credential-providers#fromenv
      region,
    },
    kmsKeyIds
  );
  
  const sig = await signer.signUserMessage(originalMsg);
  
  console.log({sig});
  const keyIndex = 1;
  const address = "0xfe433270356d985c";

  const response = await fcl.send([
    fcl.script`
    pub fun main(address: Address, keyIndex: Int, sig: String, data: String): Bool {
      let account = getAccount(address)
      let accountKey = account.keys.get(keyIndex: keyIndex) ?? panic("Provided key signature does not exist")
      let key = accountKey.publicKey
      let sig = sig.decodeHex()
      let data = data.decodeHex()
      return key.verify(signature: sig, signedData: data, domainSeparationTag: "FLOW-V0.0-user", hashAlgorithm: HashAlgorithm.SHA3_256)
    }
    `,
    fcl.args([
      fcl.arg(address, t.Address),
      fcl.arg(keyIndex, t.Int),
      fcl.arg(sig, t.String),
      fcl.arg(msg, t.String)
    ])
  ]).then(fcl.decode);

  console.log({response});

}

perform();