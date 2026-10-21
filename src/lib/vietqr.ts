// VietQR (NAPAS 247) payload in EMVCo format, scannable by every Vietnamese banking app.
// Built locally so menus do not depend on an external QR image service.

export const BANKS = [
  { bin: "970436", name: "Vietcombank" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970418", name: "BIDV" },
  { bin: "970405", name: "Agribank" },
  { bin: "970407", name: "Techcombank" },
  { bin: "970422", name: "MB Bank" },
  { bin: "970416", name: "ACB" },
  { bin: "970432", name: "VPBank" },
  { bin: "970423", name: "TPBank" },
  { bin: "970403", name: "Sacombank" },
  { bin: "970437", name: "HDBank" },
  { bin: "970441", name: "VIB" },
  { bin: "970443", name: "SHB" },
  { bin: "970431", name: "Eximbank" },
  { bin: "970426", name: "MSB" },
  { bin: "970448", name: "OCB" },
  { bin: "970440", name: "SeABank" },
  { bin: "970449", name: "LPBank" },
  { bin: "970428", name: "Nam A Bank" },
  { bin: "970409", name: "Bac A Bank" },
  { bin: "970452", name: "KienlongBank" },
  { bin: "970412", name: "PVcomBank" },
  { bin: "970425", name: "ABBANK" },
] as const;

export function bankName(bin: string | null | undefined): string {
  return BANKS.find((b) => b.bin === bin)?.name ?? "";
}

function field(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as required by EMVCo.
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Banking apps reject diacritics in the transfer note.
function asciiNote(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
    .replace(/[^A-Za-z0-9 \-]/g, "")
    .slice(0, 50)
    .trim();
}

// Without an amount the QR is static and the payer types the amount; with one (level 2 orders) it is prefilled.
export function vietQrPayload(opts: { bin: string; accountNo: string; amount?: number; addInfo?: string }): string {
  const account = field("00", "A000000727") + field("01", field("00", opts.bin) + field("01", opts.accountNo)) + field("02", "QRIBFTTA");
  const note = opts.addInfo ? asciiNote(opts.addInfo) : "";

  let payload =
    field("00", "01") +
    field("01", opts.amount ? "12" : "11") +
    field("38", account) +
    field("53", "704") +
    (opts.amount ? field("54", String(Math.round(opts.amount))) : "") +
    field("58", "VN") +
    (note ? field("62", field("08", note)) : "");
  payload += "6304";
  return payload + crc16(payload);
}
