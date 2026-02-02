import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * localStorageからエクスポートしたJSONファイルをデータベースにインポート
 * 
 * 使用方法:
 * 1. ブラウザのコンソールで以下を実行してJSONをエクスポート:
 *    JSON.stringify({
 *      reports: JSON.parse(localStorage.getItem('dentist_reports') || '[]'),
 *      recipients: JSON.parse(localStorage.getItem('dentist_recipients') || '[]')
 *    })
 * 2. エクスポートしたJSONを data.json として保存
 * 3. このスクリプトを実行: npx tsx scripts/migrate-localStorage.ts
 */

interface LocalStorageData {
  reports?: Array<{
    id: string;
    visitDate: string;
    clinicName: string;
    prefecture: string;
    city: string;
    visitedClinicWebsiteUrl?: string;
    visitedClinicChairCount?: number;
    visitedClinicStaffCount?: number;
    visitedClinicNewPatientsPerMonth?: number;
    visitedClinicSelfPayRate?: number;
    visitedClinicRecallCount?: number;
    visitedClinicInsurancePointsPerMonth?: number;
    visitedClinicStrengths?: string[];
    myClinicName?: string;
    myClinicWebsiteUrl?: string;
    impressivePoints: string;
    actionItems: Array<{
      id: string;
      title: string;
      content: string;
      photo: string;
    }>;
    pdfData?: string;
    isCompleted?: boolean;
    createdAt: string;
  }>;
  recipients?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

async function migrateData() {
  try {
    const dataPath = path.join(process.cwd(), 'data.json');
    
    if (!fs.existsSync(dataPath)) {
      console.error('エラー: data.json が見つかりません');
      console.log('使用方法:');
      console.log('1. ブラウザのコンソールで以下を実行:');
      console.log('   JSON.stringify({');
      console.log('     reports: JSON.parse(localStorage.getItem("dentist_reports") || "[]"),');
      console.log('     recipients: JSON.parse(localStorage.getItem("dentist_recipients") || "[]")');
      console.log('   })');
      console.log('2. エクスポートしたJSONを data.json として保存');
      console.log('3. このスクリプトを再実行');
      process.exit(1);
    }

    const dataContent = fs.readFileSync(dataPath, 'utf-8');
    const data: LocalStorageData = JSON.parse(dataContent);

    // デフォルトユーザーを作成（既に存在する場合はスキップ）
    const defaultEmail = 'yamashita-j@consuldent.jp';
    let defaultUser = await prisma.user.findUnique({
      where: { email: defaultEmail },
    });

    if (!defaultUser) {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('jyunpei1128', 10);
      defaultUser = await prisma.user.create({
        data: {
          email: defaultEmail,
          password: hashedPassword,
          name: 'デフォルトユーザー',
          role: 'admin',
        },
      });
      console.log('デフォルトユーザーを作成しました:', defaultEmail);
    } else {
      console.log('デフォルトユーザーは既に存在します:', defaultEmail);
    }

    // レポートをインポート
    if (data.reports && data.reports.length > 0) {
      console.log(`\n${data.reports.length}件のレポートをインポート中...`);
      
      for (const report of data.reports) {
        try {
          const visitedClinicStrengths = Array.isArray(report.visitedClinicStrengths)
            ? JSON.stringify(report.visitedClinicStrengths)
            : '[]';
          const actionItems = Array.isArray(report.actionItems)
            ? JSON.stringify(report.actionItems)
            : '[]';

          await prisma.report.create({
            data: {
              id: report.id,
              userId: defaultUser.id,
              visitDate: report.visitDate,
              clinicName: report.clinicName,
              prefecture: report.prefecture,
              city: report.city,
              visitedClinicWebsiteUrl: report.visitedClinicWebsiteUrl || null,
              visitedClinicChairCount: report.visitedClinicChairCount || null,
              visitedClinicStaffCount: report.visitedClinicStaffCount || null,
              visitedClinicNewPatientsPerMonth: report.visitedClinicNewPatientsPerMonth || null,
              visitedClinicSelfPayRate: report.visitedClinicSelfPayRate || null,
              visitedClinicRecallCount: report.visitedClinicRecallCount || null,
              visitedClinicInsurancePointsPerMonth: report.visitedClinicInsurancePointsPerMonth || null,
              visitedClinicStrengths,
              myClinicName: report.myClinicName || null,
              myClinicWebsiteUrl: report.myClinicWebsiteUrl || null,
              impressivePoints: report.impressivePoints || '',
              actionItems,
              pdfData: report.pdfData || null,
              isCompleted: report.isCompleted || false,
              version: 1,
              createdAt: new Date(report.createdAt),
            },
          });
          console.log(`  ✓ レポートをインポート: ${report.clinicName}`);
        } catch (error: any) {
          if (error.code === 'P2002') {
            console.log(`  ⚠ レポートは既に存在します: ${report.clinicName}`);
          } else {
            console.error(`  ✗ レポートのインポートに失敗: ${report.clinicName}`, error.message);
          }
        }
      }
      console.log('レポートのインポートが完了しました');
    }

    // 通知先をインポート
    if (data.recipients && data.recipients.length > 0) {
      console.log(`\n${data.recipients.length}件の通知先をインポート中...`);
      
      for (const recipient of data.recipients) {
        try {
          await prisma.recipient.create({
            data: {
              id: recipient.id,
              userId: defaultUser.id,
              name: recipient.name,
              email: recipient.email,
            },
          });
          console.log(`  ✓ 通知先をインポート: ${recipient.email}`);
        } catch (error: any) {
          if (error.code === 'P2002') {
            console.log(`  ⚠ 通知先は既に存在します: ${recipient.email}`);
          } else {
            console.error(`  ✗ 通知先のインポートに失敗: ${recipient.email}`, error.message);
          }
        }
      }
      console.log('通知先のインポートが完了しました');
    }

    console.log('\n✓ データ移行が完了しました');
  } catch (error: any) {
    console.error('データ移行エラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();
