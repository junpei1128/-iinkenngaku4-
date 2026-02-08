import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

// .envファイルを読み込む（スクリプトのディレクトリ基準）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = join(__dirname, '..');
const envPath = join(serverDir, '.env');

// 環境変数を読み込む
dotenv.config({ path: envPath });

// DATABASE_URLが設定されていない場合はエラー（本番はPostgreSQL必須）
if (!process.env.DATABASE_URL) {
  console.error('エラー: DATABASE_URL が設定されていません。');
  console.error('  - 本番: server/.env に PostgreSQL の接続URL（postgresql://...）を設定してください。');
  console.error('  - ローカル: PostgreSQL を起動し、DATABASE_URL を設定するか、Docker 等で用意してください。');
  process.exit(1);
}

console.log('DATABASE_URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')); // パスワード部分はマスク

const prisma = new PrismaClient();

/**
 * 初回ユーザーを作成するスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/create-initial-user.ts
 * 
 * または環境変数で指定:
 * INITIAL_EMAIL=your-email@example.com INITIAL_PASSWORD=your-password npx tsx scripts/create-initial-user.ts
 */

async function createInitialUser() {
  try {
    const email = process.env.INITIAL_EMAIL || 'yamashita-j@consuldent.jp';
    const password = process.env.INITIAL_PASSWORD || 'jyunpei1128';
    const name = process.env.INITIAL_NAME || 'デフォルトユーザー';

    // 既存ユーザーをチェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`ユーザーは既に存在します: ${email}`);
      console.log('既存のユーザー情報:');
      console.log(`  ID: ${existingUser.id}`);
      console.log(`  名前: ${existingUser.name || '未設定'}`);
      console.log(`  ロール: ${existingUser.role}`);
      return;
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザーを作成
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'admin',
      },
    });

    console.log('✓ 初回ユーザーを作成しました:');
    console.log(`  メールアドレス: ${user.email}`);
    console.log(`  名前: ${user.name}`);
    console.log(`  ロール: ${user.role}`);
    console.log(`  ID: ${user.id}`);
    console.log('');
    console.log('ログイン情報:');
    console.log(`  メールアドレス: ${email}`);
    console.log(`  パスワード: ${password}`);
  } catch (error: any) {
    console.error('ユーザー作成エラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createInitialUser();
