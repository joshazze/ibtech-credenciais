// Gera uma conta emissora dedicada. Rode: npm run keygen
import { Wallet } from 'ethers';

const w = Wallet.createRandom();

console.log('\nConta emissora gerada (dedicada -- nao use uma carteira pessoal):\n');
console.log('  Endereco:      ' + w.address);
console.log('  Chave privada: ' + w.privateKey);
console.log('\nProximos passos:');
console.log('  1. Copie .env.example para .env e cole a chave em PRIVATE_KEY=');
console.log('  2. Abasteca o endereco acima com tokens de teste num faucet.');
console.log('  3. NUNCA comite o .env nem compartilhe a chave privada.\n');
