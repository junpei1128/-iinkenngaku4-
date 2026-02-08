import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';
import * as fs from 'fs';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// DATABASE_URLが相対パスの場合、絶対パスに変換
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && databaseUrl.startsWith('file:./')) {
  const dbPath = resolve(process.cwd(), databaseUrl.replace('file:', ''));
  databaseUrl = `file:${dbPath}`;
  
  // データベースファイルのディレクトリが存在するか確認
  const dbDir = resolve(dbPath, '..');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // データベースファイルが存在しない場合は作成（Prismaが自動的に作成するが、念のため）
  if (!fs.existsSync(dbPath)) {
    console.log('データベースファイルが存在しないため、作成します:', dbPath);
  }
  
  // データベースファイルの書き込み権限を確認
  try {
    if (fs.existsSync(dbPath)) {
      fs.accessSync(dbPath, fs.constants.W_OK);
      console.log('データベースファイルの書き込み権限を確認しました:', dbPath);
    }
  } catch (error) {
    console.error('データベースファイルの書き込み権限エラー:', error);
    throw new Error(`データベースファイルに書き込み権限がありません: ${dbPath}`);
  }
  
  process.env.DATABASE_URL = databaseUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// データベーススキーマの自動マイグレーション（shareTokenカラムの追加）
// 本番はPostgreSQL・マイグレーションで管理するため、古いDBの互換用のみ実行
// file: のときだけ SQLite、それ以外は PostgreSQL として扱う（本番・未設定時は PostgreSQL）
async function ensureShareTokenColumn() {
  const url = (process.env.DATABASE_URL || '').trim();
  const isSqlite = url.startsWith('file:');

  try {
    if (isSqlite) {
      // SQLite のみ PRAGMA を使用（file: で始まる場合だけ）
      const tableInfo = await prisma.$queryRaw<Array<{ name: string }>>`PRAGMA table_info(reports);`;
      const hasShareToken = tableInfo.some((col: any) => col.name === 'shareToken');
      if (!hasShareToken) {
        console.log('shareTokenカラムが存在しないため、追加します...');
        await prisma.$executeRaw`ALTER TABLE "reports" ADD COLUMN "shareToken" TEXT;`;
        try {
          await prisma.$executeRaw`CREATE UNIQUE INDEX "reports_shareToken_key" ON "reports"("shareToken");`;
        } catch (e: any) {
          if (!e.message?.includes('already exists')) console.warn('shareTokenユニークインデックス作成失敗:', e.message);
        }
        try {
          await prisma.$executeRaw`CREATE INDEX "reports_shareToken_idx" ON "reports"("shareToken");`;
        } catch (e: any) {
          if (!e.message?.includes('already exists')) console.warn('shareTokenインデックス作成失敗:', e.message);
        }
        console.log('shareTokenカラムを追加しました');
      }
    } else {
      // PostgreSQL（postgresql:// または未設定・本番は必ずここ）
      const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'shareToken';
      `;
      const hasShareToken = rows.length > 0;
      if (!hasShareToken) {
        console.log('shareTokenカラムが存在しないため、追加します...');
        await prisma.$executeRawUnsafe('ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "shareToken" TEXT;');
        await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "reports_shareToken_key" ON "reports"("shareToken");');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "reports_shareToken_idx" ON "reports"("shareToken");');
        console.log('shareTokenカラムを追加しました');
      }
    }
  } catch (error: any) {
    console.error('データベーススキーマチェックエラー:', error);
  }
}

// サーバー起動時にスキーマチェックを実行
ensureShareTokenColumn().catch(console.error);
