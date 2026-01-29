import PDFDocument from "pdfkit";
import fs from "fs";
export function buildPDF(qrDataUrl, outputPath, fragmentName) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(outputPath);
        stream.on("finish", () => resolve(outputPath));
        stream.on("error", reject);
        doc.pipe(stream);
        doc.fontSize(24).text(fragmentName, { align: "center" });
        doc.moveDown();
        doc.fontSize(14).text("Please keep this document safe.", { align: "center" });
        doc.moveDown(2);
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        const qrSize = 250;
        const x = (doc.page.width - qrSize) / 2;
        doc.image(imageBuffer, x, doc.y, {
            width: qrSize,
            height: qrSize,
        });
        doc.end();
    });
}
