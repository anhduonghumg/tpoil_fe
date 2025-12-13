export const PHONE_VN = /^(0|\+84)([1-9]\d{8,9})$/;
export const CCCD_12 = /^\d{12}$/;
export const CMND_9 = /^\d{9}$/;
export const PIT_10_13 = /^\d{10}(\d{3})?$/;
export const BANK_ACC = /^\d{8,20}$/;
export const PASSPORT = /^[A-Z0-9]{7,12}$/;

export function maskId(num?: string) {
  if (!num) return "";
  if (num.length <= 4) return num;
  return num.slice(0, num.length - 4).replace(/./g, "*") + num.slice(-4);
}
