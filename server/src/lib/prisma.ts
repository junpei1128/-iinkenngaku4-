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
async function ensureShareTokenColumn() {
  try {
    // SQLiteでテーブル情報を取得
    const tableInfo = await prisma.$queryRaw<Array<{ name: string }>>`
      PRAGMA table_info(reports);
    `;
    
    // shareTokenカラムが存在するか確認
    const hasShareToken = tableInfo.some((col: any) => col.name === 'shareToken');
    
    if (!hasShareToken) {
      console.log('shareTokenカラムが存在しないため、追加します...');
      
      // shareTokenカラムを追加
      await prisma.$executeRaw`
        ALTER TABLE "reports" ADD COLUMN "shareToken" TEXT;
      `;
      
      // ユニークインデックスを作成（NULL値は除外できないため、条件付きインデックスは使用しない）
      try {
        await prisma.$executeRaw`
          CREATE UNIQUE INDEX "reports_shareToken_key" ON "reports"("shareToken");
        `;
      } catch (error: any) {
        // インデックスが既に存在する場合は無視
        if (!error.message?.includes('already exists')) {
          console.warn('shareTokenユニークインデックスの作成に失敗:', error.message);
        }
      }
      
      // 通常のインデックスを作成
      try {
        await prisma.$executeRaw`
          CREATE INDEX "reports_shareToken_idx" ON "reports"("shareToken");
        `;
      } catch (error: any) {
        // インデックスが既に存在する場合は無視
        if (!error.message?.includes('already exists')) {
          console.warn('shareTokenインデックスの作成に失敗:', error.message);
        }
      }
      
      console.log('shareTokenカラムを追加しました');
    }
  } catch (error: any) {
    console.error('データベーススキーマチェックエラー:', error);
    // エラーが発生しても続行（既にカラムが存在する可能性がある）
  }
}

// サーバー起動時にスキーマチェックを実行
ensureShareTokenColumn().catch(console.error);
