import { Response } from 'express';
import * as csv from 'fast-csv';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import PptxGenJS from 'pptxgenjs';

export async function exportData(res: Response, type: string, format: string, data: any[]) {
    switch (format) {
        case 'csv':
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${type}.csv`);
            const csvStream = csv.format({ headers: true });
            csvStream.pipe(res);
            data.forEach(row => csvStream.write(row));
            csvStream.end();
            break;
        case 'xlsx':
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${type}.xlsx`);
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Report');
            if (data.length > 0) {
                worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
                worksheet.addRows(data);
            }
            await workbook.xlsx.write(res);
            res.end();
            break;
        case 'pdf':
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${type}.pdf`);
            const doc = new PDFDocument();
            doc.pipe(res);
            doc.text(`Report: ${type}`);
            doc.moveDown();
            doc.text(JSON.stringify(data, null, 2));
            doc.end();
            break;
        case 'pptx':
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
            res.setHeader('Content-Disposition', `attachment; filename=${type}.pptx`);
            const pres = new PptxGenJS();
            const slide = pres.addSlide();
            slide.addText(`Report: ${type}`, { x: 1, y: 1 });
            slide.addText(JSON.stringify(data, null, 2), { x: 1, y: 2 });
            const buffer = await pres.write({ outputType: 'nodebuffer' } as any);
            res.send(buffer);
            break;
        default:
            res.status(400).json({ error: 'Unsupported format' });
    }
}
