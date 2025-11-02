import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Persian Date Utilities
export function formatPersianDate(date: Date): string {
  // Simple Persian date formatter - in production, use a proper Persian calendar library
  const persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  // This is a simplified conversion - use proper Persian calendar library for accuracy
  return `${day} ${persianMonths[month]} ${year}`;
}

export function formatPersianTime(date: Date): string {
  return date.toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function formatPersianDateTime(date: Date): string {
  return `${formatPersianDate(date)} - ${formatPersianTime(date)}`;
}

// Persian Number Formatting
export function toPersianNumbers(str: string | number): string {
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/[0-9]/g, (char) => persianNumbers[parseInt(char)]);
}

// Currency Formatting
export function formatPersianCurrency(amount: number, currency: string = 'تومان'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return `${formatted} ${currency}`;
}

// Persian Trading Status
export function getPersianTradingStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'BUY': 'خرید',
    'SELL': 'فروش',
    'HOLD': 'نگهداری',
    'PENDING': 'در انتظار',
    'FILLED': 'تکمیل شده',
    'CANCELLED': 'لغو شده',
    'REJECTED': 'رد شده',
    'PARTIALLY_FILLED': 'جزئاً تکمیل شده'
  };

  return statusMap[status] || status;
}

// Persian Market Status
export function getPersianMarketStatus(isOpen: boolean): string {
  return isOpen ? 'باز' : 'بسته';
}

// Persian Greeting based on time
export function getPersianGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'صبح بخیر';
  if (hour >= 12 && hour < 17) return 'ظهر بخیر';
  if (hour >= 17 && hour < 21) return 'عصر بخیر';
  return 'شب بخیر';
}
