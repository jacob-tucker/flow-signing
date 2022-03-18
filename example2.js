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
  
  const sig = await signer.sign(USER_DOMAIN_TAG + msg);
  
  console.log({sig});
  const publicKey = "9a92119dd26b80cf9f4daf29340d68043d15685f0ac2c93203681b73960ffe9fa026efb9ba2f72a3f15884e849c4b7f8bf8fb086382488ffdcdf21c7e90560b7";

  const response = await fcl.send([
    fcl.script`
    pub fun main(publicKey: String, sig: String, data: String): Bool {
      let bytes = publicKey.decodeHex()
      let key = PublicKey(
        publicKey: bytes,
        signatureAlgorithm: SignatureAlgorithm.ECDSA_secp256k1
      )
      let sig = sig.decodeHex()
      let data = data.decodeHex()
      return key.verify(signature: sig, signedData: data, domainSeparationTag: "FLOW-V0.0-user", hashAlgorithm: HashAlgorithm.SHA3_256)
    }
    `,
    fcl.args([
      fcl.arg(publicKey, t.String),
      fcl.arg(sig, t.String),
      fcl.arg(msg, t.String)
    ])
  ]).then(fcl.decode);

  console.log({response});

}

perform();