const fcl = require("@onflow/fcl");
const t = require("@onflow/types");
const { SHA3 } = require("sha3");
var EC = require('elliptic').ec;
var ec_secp = new EC('secp256k1');
var ec_p256 = new EC('p256');

fcl.config()
  .put("accessNode.api", "https://testnet.onflow.org")

const sign = (message) => {
    const key = ec_secp.keyFromPrivate(Buffer.from("a0063231fb80183ab7216b9cff8f49b58d29fc4a5f9726007fdf14172d70c78b", "hex"))
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

const rightPaddedHexBuffer = (value, pad) => {
  return Buffer.from(value.padEnd(pad * 2, 0), 'hex')
}

const USER_DOMAIN_TAG = rightPaddedHexBuffer(
  Buffer.from('FLOW-V0.0-user').toString('hex'),
  32
).toString('hex');

async function perform() {
  const msg = Buffer.from("CHANGE_DISCORD").toString('hex');
  console.log({msg})
  
  const sig = sign(USER_DOMAIN_TAG + msg);
  console.log({sig});
  const keyIndex = 0;
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