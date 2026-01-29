import QRCode from "qrcode";
// Generate QR Code
export async function generateQR(x) {
    const dataUrl = await QRCode.toDataURL(x);
    return dataUrl;
}
