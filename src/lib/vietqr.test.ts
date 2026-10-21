import { describe, expect, it } from "vitest";
import { crc16, vietQrPayload } from "./vietqr";

describe("crc16", () => {
  it("matches the CRC-16/CCITT-FALSE check value", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("vietQrPayload", () => {
  it("builds a static QR without amount", () => {
    const payload = vietQrPayload({ bin: "970436", accountNo: "0123456789" });
    expect(payload.startsWith("000201010211")).toBe(true);
    expect(payload).toContain("38540010A00000072701240006970436011001234567890208QRIBFTTA");
    expect(payload).toContain("5303704");
    expect(payload).toContain("5802VN");
    expect(payload).toContain("53037045802VN"); // no amount field (54) between currency and country
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });

  it("builds a dynamic QR with amount and an ASCII note", () => {
    const payload = vietQrPayload({ bin: "970422", accountNo: "123", amount: 58000, addInfo: "Bàn 5 - Đơn 12" });
    expect(payload).toContain("010212");
    expect(payload).toContain("540558000");
    expect(payload).toContain("62180814Ban 5 - Don 12");
  });
});
