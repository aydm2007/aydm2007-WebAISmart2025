import express from 'express';
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const router = express.Router();

router.post('/export/excel', async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Analysis');
    ws.columns = [
      { header: 'العنوان', key: 'title', width: 40 },
      { header: 'المستوى', key: 'level', width: 15 },
      { header: 'الوصف', key: 'description', width: 80 },
    ];
    const insights = (req.body?.data?.insights) || [];
    insights.forEach((i:any) => ws.addRow(i));
    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="analysis.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (e:any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/export/pdf', async (req, res) => {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const insights = (req.body?.data?.insights) || [];
    let y = 800;
    page.drawText('تقرير التحليلات', { x: 50, y, size: 18, font });
    y -= 30;
    insights.slice(0, 20).forEach((i:any, idx:number) => {
      page.drawText(`${idx+1}. ${i.title} - ${i.level}`, { x: 50, y, size: 12, font });
      y -= 18;
    });
    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="analysis.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (e:any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/export/table-excel', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Data');
    const columns = Array.from(new Set(rows.flatMap((r:any)=>Object.keys(r||{}))));
    ws.columns = columns.map(c => ({ header: c, key: c, width: Math.min(40, Math.max(10, String(c).length + 4)) }));
    for (const r of rows) {
      const row:any = {};
      for (const c of columns) row[c] = r?.[c] ?? '';
      ws.addRow(row);
    }
    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="table.xlsx"');
    res.send(Buffer.from(buf));
  } catch (e:any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/export/table-pdf', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const columns = Array.from(new Set(rows.flatMap((r:any)=>Object.keys(r||{}))));
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pageWidth = 595; const pageHeight = 842;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 50;
    const left = 40;

    function drawText(text: string, x: number, y: number, size=10) {
      page.drawText(text, { x, y, size, font });
    }

    // Title
    drawText('جدول البيانات (أول 500 صف)', left, y, 14);
    y -= 20;

    // Header
    const header = columns.join(' | ');
    drawText(header.slice(0, 140), left, y, 10);
    y -= 14;

    let count = 0;
    for (const r of rows.slice(0, 500)) {
      const line = columns.map(c => String(r?.[c] ?? '')).join(' | ');
      for (const chunk of line.match(/.{1,140}/g) || ['']) {
        if (y < 50) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - 50; }
        drawText(chunk, left, y, 9);
        y -= 12;
      }
      count++;
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="table.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (e:any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
