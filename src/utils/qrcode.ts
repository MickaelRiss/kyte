import QRCode from "qrcode";

// Generate QR Code
export async function generateQR(x: string): Promise<string> {
    const dataUrl = await QRCode.toDataURL(x);
    return dataUrl; 
}