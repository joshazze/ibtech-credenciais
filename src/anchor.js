// Etapa 2 -- assina e ancora os certificados na blockchain.
// Calcula o hash de cada certificado, monta uma arvore de Merkle e grava
// a raiz numa UNICA transacao. Cada certificado recebe um bloco `proof`
// com seu caminho de Merkle e o hash da transacao.
// Rode: npm run anchor   (precisa de .env preenchido + saldo na conta)
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { JsonRpcProvider, Wallet } from 'ethers';
import { certHash, buildMerkle, merkleRoot, merkleProof } from './lib.js';

const { RPC_URL, PRIVATE_KEY, CHAIN } = process.env;
if (!RPC_URL || !PRIVATE_KEY) {
  console.error('Faltam RPC_URL / PRIVATE_KEY. Copie .env.example para .env e preencha.');
  process.exit(1);
}

const files = readdirSync('certs/unsigned').filter((f) => f.endsWith('.json'));
if (files.length === 0) {
  console.error('Nenhum certificado em certs/unsigned. Rode: npm run build');
  process.exit(1);
}

const certs = files.map((f) => ({ file: f, cert: JSON.parse(readFileSync(`certs/unsigned/${f}`, 'utf8')) }));
const leaves = certs.map((c) => certHash(c.cert));
const layers = buildMerkle(leaves);
const root = merkleRoot(layers);
console.log(`${certs.length} certificado(s). Raiz de Merkle: ${root}`);

const provider = new JsonRpcProvider(RPC_URL);
const wallet = new Wallet(PRIVATE_KEY, provider);
const balance = await provider.getBalance(wallet.address);
console.log(`Conta emissora: ${wallet.address}`);
console.log(`Saldo: ${balance} wei`);
if (balance === 0n) {
  console.error('Saldo zero -- abasteca a conta num faucet antes de ancorar.');
  process.exit(1);
}

console.log('Enviando transacao de ancoragem...');
const tx = await wallet.sendTransaction({ to: wallet.address, value: 0, data: '0x' + root });
console.log('  tx: ' + tx.hash);
const receipt = await tx.wait();
console.log('  confirmada no bloco ' + receipt.blockNumber);

mkdirSync('certs/signed', { recursive: true });
certs.forEach((c, i) => {
  const signed = {
    ...c.cert,
    proof: {
      type: 'MerkleProofIbTech2026',
      chain: CHAIN || 'polygon-amoy',
      anchorTransaction: tx.hash,
      merkleRoot: root,
      targetHash: leaves[i],
      merklePath: merkleProof(layers, i),
    },
  };
  writeFileSync(`certs/signed/${c.file}`, JSON.stringify(signed, null, 2) + '\n');
  console.log('assinado: certs/signed/' + c.file);
});

console.log('\nPronto. Verifique com: npm run verify -- certs/signed/<arquivo>.json');
