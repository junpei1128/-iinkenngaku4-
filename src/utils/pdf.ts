import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Report } from '../types';

// 日付をフォーマット
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

// レポートデータからHTMLコンテンツを生成
const generateHTMLContent = (report: Report): string => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', 'MS PGothic', sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          width: 794px; /* A4 width in pixels at 96 DPI */
          background: white;
          overflow: hidden;
        }
        .content-wrapper {
          padding: 40px;
          width: 100%;
          box-sizing: border-box;
        }
        h1 {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        h2 {
          font-size: 16px;
          font-weight: bold;
          margin-top: 20px;
          margin-bottom: 10px;
          border-left: 4px solid #333;
          padding-left: 10px;
        }
        .section {
          margin-bottom: 20px;
        }
        .info-row {
          margin-bottom: 8px;
        }
        .label {
          font-weight: bold;
          display: inline-block;
          min-width: 120px;
        }
        .value {
          display: inline-block;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .strengths {
          margin-top: 10px;
        }
        .strength-item {
          display: inline-block;
          background: #f0f0f0;
          padding: 4px 8px;
          margin: 4px 4px 4px 0;
          border-radius: 4px;
        }
        .action-item {
          margin-top: 20px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #fafafa;
        }
        .action-item-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .action-item-content {
          margin-bottom: 10px;
          white-space: pre-wrap;
        }
        .action-item-photo {
          max-width: 100%;
          max-height: 200px;
          object-fit: contain;
          margin-top: 10px;
          border: 1px solid #ddd;
        }
        .text-content {
          white-space: pre-wrap;
          margin-top: 10px;
          line-height: 1.8;
        }
      </style>
    </head>
    <body>
      <div class="content-wrapper">
      <h1>歯科医院見学レポート</h1>
      
      <div class="section">
        <div class="info-row">
          <span class="label">見学日:</span>
          <span class="value">${formatDate(report.visitDate)}</span>
        </div>
      </div>

      <div class="section">
        <h2>見学先医院情報</h2>
        <div class="info-row">
          <span class="label">医院名:</span>
          <span class="value">${report.clinicName || ''}</span>
        </div>
        <div class="info-row">
          <span class="label">所在地:</span>
          <span class="value">${report.prefecture || ''} ${report.city || ''}</span>
        </div>
        ${report.visitedClinicWebsiteUrl ? `
        <div class="info-row">
          <span class="label">HP:</span>
          <span class="value">${report.visitedClinicWebsiteUrl}</span>
        </div>
        ` : ''}
      </div>

      ${report.visitedClinicChairCount !== undefined || 
        report.visitedClinicStaffCount !== undefined ||
        report.visitedClinicNewPatientsPerMonth !== undefined ||
        report.visitedClinicSelfPayRate !== undefined ||
        report.visitedClinicRecallCount !== undefined ||
        report.visitedClinicInsurancePointsPerMonth !== undefined ? `
      <div class="section">
        <h2>医院見学先の情報</h2>
        <div class="info-grid">
          ${report.visitedClinicChairCount !== undefined ? `
          <div class="info-row">
            <span class="label">チェア台数:</span>
            <span class="value">${report.visitedClinicChairCount}</span>
          </div>
          ` : ''}
          ${report.visitedClinicStaffCount !== undefined ? `
          <div class="info-row">
            <span class="label">スタッフ人数:</span>
            <span class="value">${report.visitedClinicStaffCount}</span>
          </div>
          ` : ''}
          ${report.visitedClinicNewPatientsPerMonth !== undefined ? `
          <div class="info-row">
            <span class="label">新規患者数/月:</span>
            <span class="value">${report.visitedClinicNewPatientsPerMonth}</span>
          </div>
          ` : ''}
          ${report.visitedClinicSelfPayRate !== undefined ? `
          <div class="info-row">
            <span class="label">自費率:</span>
            <span class="value">${report.visitedClinicSelfPayRate}%</span>
          </div>
          ` : ''}
          ${report.visitedClinicRecallCount !== undefined ? `
          <div class="info-row">
            <span class="label">リコール人数:</span>
            <span class="value">${report.visitedClinicRecallCount}</span>
          </div>
          ` : ''}
          ${report.visitedClinicInsurancePointsPerMonth !== undefined && report.visitedClinicInsurancePointsPerMonth !== null ? `
          <div class="info-row">
            <span class="label">保険金額:</span>
            <span class="value">${report.visitedClinicInsurancePointsPerMonth.toLocaleString()}円</span>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      ${report.visitedClinicStrengths && report.visitedClinicStrengths.length > 0 ? `
      <div class="section">
        <h2>医院見学先の強み</h2>
        <div class="strengths">
          ${report.visitedClinicStrengths.map(strength => 
            `<span class="strength-item">${strength}</span>`
          ).join('')}
        </div>
      </div>
      ` : ''}

      ${report.myClinicName || report.myClinicWebsiteUrl ? `
      <div class="section">
        <h2>あなたの医院情報</h2>
        ${report.myClinicName ? `
        <div class="info-row">
          <span class="label">医院名:</span>
          <span class="value">${report.myClinicName}</span>
        </div>
        ` : ''}
        ${report.myClinicWebsiteUrl ? `
        <div class="info-row">
          <span class="label">HP:</span>
          <span class="value">${report.myClinicWebsiteUrl}</span>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${report.impressivePoints ? `
      <div class="section">
        <h2>見学して「すごい」と思ったこと</h2>
        <div class="text-content">${report.impressivePoints}</div>
      </div>
      ` : ''}

      ${report.actionItems && report.actionItems.length > 0 ? `
      <div class="section">
        <h2>医院で実践したいこと</h2>
        ${report.actionItems.map((item, index) => `
          <div class="action-item">
            <div class="action-item-title">項目 ${index + 1}</div>
            ${item.title ? `
            <div class="info-row">
              <span class="label">タイトル:</span>
              <span class="value">${item.title}</span>
            </div>
            ` : ''}
            ${item.content ? `
            <div class="action-item-content">
              <span class="label">内容:</span><br>
              <span class="value">${item.content}</span>
            </div>
            ` : ''}
            ${(item.photos ?? (item.photo ? [item.photo] : [])).map((src, i) => `
            <img src="${src}" alt="写真 ${i + 1}" class="action-item-photo" />
            `).join('')}
          </div>
        `).join('')}
      </div>
      ` : ''}
      </div>
    </body>
    </html>
  `;
  return html;
};

export const generateReportPDF = async (report: Report): Promise<string> => {
  // HTMLコンテンツを生成
  const htmlContent = generateHTMLContent(report);

  // 一時的なDOM要素を作成
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.style.width = '794px'; // A4 width
  tempDiv.style.overflow = 'visible';
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);

  try {
    // 画像の読み込みを待つ
    const images = tempDiv.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
      })
    );

    // html2canvasでHTMLを画像に変換
    const canvas = await html2canvas(tempDiv, {
      scale: 2, // 高解像度
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // PDFを作成
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    // 複数ページに分割
    let heightLeft = imgHeight;
    let position = 0;

    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // PDFをBase64文字列に変換
    const pdfOutput = doc.output('datauristring');
    const base64Data = pdfOutput.split(',')[1];
    
    return base64Data;
  } finally {
    // 一時的なDOM要素を削除
    document.body.removeChild(tempDiv);
  }
};

// Base64データを検証・正規化する関数
export const normalizeBase64PDF = (pdfData: string | null | undefined): string => {
  if (!pdfData || pdfData.trim() === '') {
    throw new Error('PDFデータが空です');
  }
  
  // data:application/pdf;base64,プレフィックスを除去
  let normalized = pdfData.trim();
  if (normalized.startsWith('data:application/pdf;base64,')) {
    normalized = normalized.replace('data:application/pdf;base64,', '');
  } else if (normalized.startsWith('data:application/pdf,')) {
    normalized = normalized.replace('data:application/pdf,', '');
  }
  
  // Base64文字列の検証（基本的な形式チェック）
  if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    throw new Error('PDFデータの形式が正しくありません（Base64形式ではありません）');
  }
  
  return normalized;
};
