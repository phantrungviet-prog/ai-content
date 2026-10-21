"use client";

import { useState } from "react";

type Props = { qrDataUrl: string; bank: string; accountNo: string; accountName: string | null };

export function PaymentButton({ qrDataUrl, bank, accountNo, accountName }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <>
      <div className="sticky bottom-0 z-10 border-t border-slate-100 bg-white/95 p-3 backdrop-blur">
        <button onClick={() => setOpen(true)} className="w-full rounded-full bg-orange-600 py-3 font-semibold text-white">
          Thanh toán chuyển khoản
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-t-3xl bg-white p-6 text-center sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Quét mã để chuyển khoản</h2>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
            <img src={qrDataUrl} alt="Mã VietQR" className="mx-auto w-60" />
            <div className="text-sm">
              <p className="font-medium">{bank}</p>
              <p className="text-lg font-semibold tracking-wide">{accountNo}</p>
              {accountName && <p className="text-slate-600">{accountName}</p>}
            </div>
            <p className="text-xs text-slate-500">Mở app ngân hàng → Quét QR → nhập số tiền theo hóa đơn. Báo nhân viên sau khi chuyển.</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(accountNo);
                  setCopied(true);
                }}
                className="flex-1 rounded-full border border-slate-300 py-2 text-sm"
              >
                {copied ? "Đã copy số TK" : "Copy số tài khoản"}
              </button>
              <button onClick={() => setOpen(false)} className="flex-1 rounded-full bg-slate-900 py-2 text-sm text-white">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
