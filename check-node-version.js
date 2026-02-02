#!/usr/bin/env node

/**
 * Node.jsバージョンチェックスクリプト
 * package.jsonのengines指定に基づいてNode.jsバージョンを確認します
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// package.jsonを読み込む
const packageJsonPath = join(__dirname, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

// 現在のNode.jsバージョンを取得
const currentNodeVersion = process.version;
const nodeVersionNumber = parseInt(currentNodeVersion.slice(1).split('.')[0]);

// engines指定を確認
const engines = packageJson.engines;
if (!engines || !engines.node) {
  console.log('⚠ package.jsonにengines指定がありません');
  process.exit(0);
}

// バージョン範囲を解析（例: ">=18.0.0 <=20.x.x"）
const nodeRequirement = engines.node;
const isVersion24 = nodeVersionNumber === 24;
const isVersion20 = nodeVersionNumber === 20;
const isVersion18 = nodeVersionNumber === 18;

console.log(`現在のNode.jsバージョン: ${currentNodeVersion}`);
console.log(`推奨バージョン: ${nodeRequirement}`);

if (isVersion24) {
  console.error('\n❌ エラー: Node.js v24は互換性問題が発生する可能性があります');
  console.error('推奨: Node.js v20 LTSにダウングレードしてください');
  console.error('\n解決方法:');
  console.error('1. Node.js v20 LTSをダウンロード: https://nodejs.org/');
  console.error('2. または、nvmを使用している場合:');
  console.error('   nvm install 20');
  console.error('   nvm use 20');
  process.exit(1);
} else if (isVersion20 || isVersion18) {
  console.log('✅ Node.jsバージョンは推奨範囲内です');
  process.exit(0);
} else {
  console.warn(`⚠ 警告: Node.js v${nodeVersionNumber}は推奨バージョンではありません`);
  console.warn('Node.js v18またはv20の使用を推奨します');
  process.exit(0);
}
