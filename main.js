import 'dotenv/config';

import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";
import { Signer } from "fcl-kms-authorizer";
import { fromEnv } from "@aws-sdk/credential-providers";

const region = "us-east-1";
const kmsKeyIds = [process.env.KMS_KEY_IDS];

import { SHA3 } from "sha3";

import { ec } from 'elliptic';
var ec_secp256k1 = new ec('secp256k1');

const sign = (message) => {
    const key = ec_secp256k1.keyFromPrivate(Buffer.from(process.env.TESTNET_PRIVATE_KEY, "hex"))
    const sig = key.sign(hash(message)) // hashMsgHex -> hash
    const n = 32
    const r = sig.r.toArrayLike(Buffer, "be", n)
    const s = sig.s.toArrayLike(Buffer, "be", n)
    return Buffer.concat([r, s]).toString("hex")
}

const hash = (message) => {
    const sha = new SHA3(256);
    sha.update(Buffer.from(message, "hex"));
    return sha.digest();
}

const getInfoUUID = async (userAddr) => {
  const response = await fcl.send([
    fcl.script`
    import EmeraldID from 0xEmeraldID

    pub fun main(user: Address): UInt64 {
      let info = getAccount(user).getCapability(EmeraldID.InfoPublicPath)
                  .borrow<&EmeraldID.Info{EmeraldID.InfoPublic}>()
                  ?? panic("This user does not have an EmeraldID")
      return info.uuid
    }
    `,
    fcl.args([
      fcl.arg(userAddr, t.Address)
    ])
  ]).then(fcl.decode);

  console.log({response});
  return response;
}

const getIntentScript = (field, userAddr, value) => {
  return `CHANGE_${userAddr}_${field}_${value}`;
}

export default async function handler(req, res) {
  // validate user data with blocto

  // User is now validated //


  /* Signature Stuff */
  const identifier = 1234567890;
  const discordId = "789012";
  const intent = "CHANGE_DISCORD";
  const latestBlock = await fcl.latestBlock();
  const prefix = Buffer.from(`${intent}${identifier}`).toString('hex');

  const msg = "123456" // `${prefix}${latestBlock.id}`;

  // Create an instance of the authorizer
  const signer = new Signer(
    // The first argument can be the same as the option for AWS client.
    {
      credentials: fromEnv(), // see. https://github.com/aws/aws-sdk-js-v3/tree/main/packages/credential-providers#fromenv
      region,
    },
    kmsKeyIds
  );

  const sig = await signer.signUserMessage(msg);

  console.log({sig})
  console.log({msg})
  const admin = "0xfe433270356d985c";

  const keyIds = [1];
  const signatures = [sig];

  res.json({ discordId, admin, msg, keyIds, signatures, height: latestBlock.height })
  
};