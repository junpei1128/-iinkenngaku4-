/**
 * 環境変数の設定を確認するスクリプト
 * 実行方法: tsx scripts/check-env.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// 環境変数を読み込む
const envPath = resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

console.log('=== 環境変数の確認 ===\n');
console.log(`環境変数ファイルのパス: ${envPath}`);

if (result.error) {
  console.error('❌ .envファイルの読み込みに失敗しました:', result.error.message);
  console.log('\n.envファイルが存在しない場合は、以下を実行してください:');
  console.log('  cp env.example .env');
  process.exit(1);
}

console.log('✓ .envファイルを読み込みました\n');

// 環境変数の確認
const requiredVars = {
  'PORT': process.env.PORT || '3001 (デフォルト)',
  'FRONTEND_URL': process.env.FRONTEND_URL || 'http://localhost:5185 (デフォルト)',
  'DATABASE_URL': process.env.DATABASE_URL || '未設定',
  'JWT_SECRET': process.env.JWT_SECRET ? '設定済み' : '未設定',
  'GMAIL_USER': process.env.GMAIL_USER || '未設定',
  'GMAIL_APP_PASSWORD': process.env.GMAIL_APP_PASSWORD ? 
    (process.env.GMAIL_APP_PASSWORD.includes('your_16_character') ? 
      '未設定（プレースホルダー）' : 
      `設定済み（${process.env.GMAIL_APP_PASSWORD.length}文字）`) : 
    '未設定',
};

console.log('環境変数の設定状況:');
console.log('─'.repeat(50));
for (const [key, value] of Object.entries(requiredVars)) {
  const status = value.includes('未設定') || value.includes('プレースホルダー') ? '❌' : '✓';
  console.log(`${status} ${key}: ${value}`);
}
console.log('─'.repeat(50));

// Gmail設定の確認
const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

if (!gmailUser || !gmailAppPassword || 
    gmailUser.includes('your-email') || 
    gmailAppPassword.includes('your_16_character')) {
  console.log('\n⚠ Gmail認証情報が正しく設定されていません。');
  console.log('\n設定手順:');
  console.log('1. Googleアカウントで2段階認証を有効化');
  console.log('2. アプリパスワードを生成（Googleアカウント → セキュリティ → アプリパスワード）');
  console.log('3. server/.envファイルを編集:');
  console.log('   GMAIL_USER=your-actual-email@gmail.com');
  console.log('   GMAIL_APP_PASSWORD=your_16_character_app_password');
  console.log('\n詳細は server/README.md を参照してください。');
  process.exit(1);
} else {
  console.log('\n✓ Gmail認証情報が正しく設定されています。');
  process.exit(0);
}
