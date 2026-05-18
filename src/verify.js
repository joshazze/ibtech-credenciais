// Verifica um certificado assinado, na linha de comando.
// Roda as 3 checagens: integridade, inclusao na arvore e ancoragem on-chain.
// Rode: npm run verify -- certs/signed/<arquivo>.json
import { readFileSync } from 'node:fs';
import { JsonRpcProvider } from 'ethers';
import { certHash, verifyMerkleProof } from './lib.js';

const file = process.argv[2];
if (!file) {
  console.error('Uso: npm run verify -- certs/signed/<arquivo>.json');
  process.exit(1);
}

const cert = JSON.parse(readFileSync(file, 'utf8'));
const proof = cert.proof;
if (!proof) {
  console.error('Certificado sem bloco proof -- ainda nao foi ancorado.');
  process.exit(1);
}

let ok = true;
const check = (label, pass) => {
  console.log(`  [${pass ? 'OK' : '--'}] ${label}`);
  if (!pass) ok = false;
};

console.log(`\nVerificando: ${file}\n`);

// 1. Integridade -- o hash do certificado bate com o registrado.
check('Integridade (o conteudo nao foi alterado)', certHash(cert) === proof.targetHash);

// 2. Merkle -- a folha pertence a arvore cuja raiz foi ancorada.
check('Inclusao na arvore de Merkle', verifyMerkleProof(proof.targetHash, proof.merklePath, proof.merkleRoot));

// 3. On-chain -- a transacao existe e carrega a raiz de Merkle.
const { RPC_URL } = process.env;
if (!RPC_URL) {
  console.error('\nDefina RPC_URL no .env para verificar a ancoragem on-chain.');
  process.exit(1);
}
const provider = new JsonRpcProvider(RPC_URL);
const tx = await provider.getTransaction(proof.anchorTransaction);
check('Ancoragem on-chain (transacao confere)', !!tx && tx.data === '0x' + proof.merkleRoot);

console.log(ok ? '\n==> Credencial VALIDA\n' : '\n==> Credencial INVALIDA\n');
process.exit(ok ? 0 : 1);
