#!/usr/bin/env node

/**
 * Node.jsバージョンチェックスクリプト（サーバー用）
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = join(__dirname, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const currentNodeVersion = process.version;
const nodeVersionNumber = parseInt(currentNodeVersion.slice(1).split('.')[0]);

const engines = packageJson.engines;
if (!engines || !engines.node) {
  console.log('⚠ package.jsonにengines指定がありません');
  process.exit(0);
}

const nodeRequirement = engines.node;
const isVersion24 = nodeVersionNumber === 24;
const isVersion20 = nodeVersionNumber === 20;
const isVersion18 = nodeVersionNumber === 18;

console.log(`現在のNode.jsバージョン: ${currentNodeVersion}`);
console.log(`推奨バージョン: ${nodeRequirement}`);

if (isVersion24) {
  console.error('\n❌ エラー: Node.js v24は互換性問題が発生する可能性があります');
  console.error('推奨: Node.js v20 LTSにダウングレードしてください');
  process.exit(1);
} else if (isVersion20 || isVersion18) {
  console.log('✅ Node.jsバージョンは推奨範囲内です');
  process.exit(0);
} else {
  console.warn(`⚠ 警告: Node.js v${nodeVersionNumber}は推奨バージョンではありません`);
  process.exit(0);
}
