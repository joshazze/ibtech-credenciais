// Funcoes compartilhadas: canonicalizacao, hash e arvore de Merkle.
// Usadas por anchor.js e verify.js. A mesma logica esta reimplementada
// em verifier/index.html para verificacao no navegador.
import crypto from 'node:crypto';

// Serializa um valor de forma deterministica: chaves de objeto ordenadas,
// sem espacos. Garante que o mesmo certificado sempre gere o mesmo hash.
export function canonicalize(value) {
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort()
      .map((k) => JSON.stringify(k) + ':' + canonicalize(value[k]))
      .join(',') + '}';
  }
  return JSON.stringify(value);
}

export function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Hash de um certificado, ignorando o bloco proof (que e adicionado depois).
export function certHash(cert) {
  const { proof, ...rest } = cert;
  return sha256Hex(Buffer.from(canonicalize(rest), 'utf8'));
}

// Hash de dois nos da arvore: sha256 da concatenacao dos bytes.
function hashPair(a, b) {
  return sha256Hex(Buffer.concat([Buffer.from(a, 'hex'), Buffer.from(b, 'hex')]));
}

// Constroi a arvore de Merkle. Retorna as camadas (folhas -> raiz).
// Em camada de tamanho impar, o ultimo no e duplicado.
export function buildMerkle(leaves) {
  if (leaves.length === 0) throw new Error('sem folhas para a arvore');
  const layers = [leaves.slice()];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      const right = i + 1 < prev.length ? prev[i + 1] : prev[i];
      next.push(hashPair(prev[i], right));
    }
    layers.push(next);
  }
  return layers;
}

export function merkleRoot(layers) {
  return layers[layers.length - 1][0];
}

// Caminho de prova para a folha em `index`: lista de irmaos com o lado.
export function merkleProof(layers, index) {
  const path = [];
  let idx = index;
  for (let level = 0; level < layers.length - 1; level++) {
    const layer = layers[level];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    const sibling = siblingIdx < layer.length ? layer[siblingIdx] : layer[idx];
    path.push(isRight ? { left: sibling } : { right: sibling });
    idx = Math.floor(idx / 2);
  }
  return path;
}

// Refaz o caminho da folha ate a raiz e confere se bate.
export function verifyMerkleProof(leaf, path, root) {
  let h = leaf;
  for (const step of path) {
    h = step.left ? hashPair(step.left, h) : hashPair(h, step.right);
  }
  return h === root;
}
