export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SHOP_OWNER = 'SHOP_OWNER',
  SHOP_STAFF = 'SHOP_STAFF',
  CUSTOMER_SESSION = 'CUSTOMER_SESSION',
}

export enum ShopStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
}

export enum SubscriptionStatus {
  INACTIVE = 'INACTIVE',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum SubscriptionInterval {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum JobStatus {
  REQUEST_SENT = 'REQUEST_SENT',
  SHOP_RECEIVED = 'SHOP_RECEIVED',
  PRINTING = 'PRINTING',
  PRINTING_COMPLETED = 'PRINTING_COMPLETED',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  CLEANUP_PENDING = 'CLEANUP_PENDING',
  FILES_DELETED = 'FILES_DELETED',
  JOB_CLOSED = 'JOB_CLOSED',
  PRINT_FAILED = 'PRINT_FAILED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  PAYMENT_UNKNOWN = 'PAYMENT_UNKNOWN',
  CLEANUP_FAILED = 'CLEANUP_FAILED',
}

export enum PaymentStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  UNKNOWN = 'UNKNOWN',
  REFUNDED = 'REFUNDED',
  REVERSED = 'REVERSED',
}

export enum PaymentMethod {
  CASHFREE = 'CASHFREE',
  CASH = 'CASH',
}

export enum AgentStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  CONNECTING = 'CONNECTING',
  RECONNECTING = 'RECONNECTING',
  REVOKED = 'REVOKED',
  ERROR = 'ERROR',
  UNKNOWN = 'UNKNOWN',
}

export enum PrinterStatus {
  DISCOVERED = 'DISCOVERED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  READY = 'READY',
  PRINTING = 'PRINTING',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
  UNKNOWN = 'UNKNOWN',
}

export enum PrintAttemptStatus {
  QUEUED = 'QUEUED',
  SUBMITTED = 'SUBMITTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  PRINTING = 'PRINTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SUBMISSION_UNKNOWN = 'SUBMISSION_UNKNOWN',
}

export type ColorMode = 'BW' | 'COLOR';
export type PaperSize = 'A4' | 'A3' | 'LEGAL' | 'LETTER';
export type DuplexMode = 'NONE' | 'LONG_EDGE' | 'SHORT_EDGE';
export type PageOrientation = 'PORTRAIT' | 'LANDSCAPE';

export interface PrintOptions {
  colorMode: ColorMode;
  copies: number;
  pageRange?: string; // e.g. "1-5, 8" or "all"
  paperSize: PaperSize;
  duplex: DuplexMode;
  orientation: PageOrientation;
}

export interface PricingSnapshot {
  calculatedAt: string; // ISO date string
  currency: string;     // e.g. "INR"
  bwPageCount: number;
  colorPageCount: number;
  totalPageCount: number;
  copies: number;
  ratePerBwPage: number;
  ratePerColorPage: number;
  duplexMultiplier: number;
  subtotal: number;
  taxAmount: number;
  finalAmount: number; // Stored in INR (decimal or paisa representation)
}

export interface ShopPricingRules {
  ratePerBwPage: number;      // e.g., 2.00 INR
  ratePerColorPage: number;   // e.g., 10.00 INR
  rateA3Multiplier: number;   // e.g., 2.0
  rateLegalMultiplier: number;// e.g., 1.2
  duplexDiscountPercent: number; // e.g., 10%
  minimumOrderAmount: number; // e.g., 2.00 INR
  currency: string;
}

export interface PrinterCapabilities {
  supportsColor: boolean;
  supportsDuplex: boolean;
  supportedPaperSizes: PaperSize[];
  supportedOrientations: PageOrientation[];
  resolutionsDpi: number[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Strict valid state transitions
export const VALID_JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.REQUEST_SENT]: [JobStatus.SHOP_RECEIVED, JobStatus.PRINT_FAILED, JobStatus.JOB_CLOSED],
  [JobStatus.SHOP_RECEIVED]: [JobStatus.PRINTING, JobStatus.PRINT_FAILED, JobStatus.JOB_CLOSED],
  [JobStatus.PRINTING]: [JobStatus.PRINTING_COMPLETED, JobStatus.PRINT_FAILED],
  [JobStatus.PRINT_FAILED]: [JobStatus.SHOP_RECEIVED, JobStatus.JOB_CLOSED], // Retry physical print or cancel
  [JobStatus.PRINTING_COMPLETED]: [JobStatus.AWAITING_PAYMENT],
  [JobStatus.AWAITING_PAYMENT]: [JobStatus.PAYMENT_PENDING, JobStatus.PAYMENT_SUCCESS, JobStatus.PAYMENT_CANCELLED],
  [JobStatus.PAYMENT_PENDING]: [JobStatus.PAYMENT_SUCCESS, JobStatus.PAYMENT_FAILED, JobStatus.PAYMENT_CANCELLED, JobStatus.PAYMENT_UNKNOWN],
  [JobStatus.PAYMENT_FAILED]: [JobStatus.AWAITING_PAYMENT, JobStatus.PAYMENT_CANCELLED],
  [JobStatus.PAYMENT_CANCELLED]: [JobStatus.AWAITING_PAYMENT, JobStatus.JOB_CLOSED],
  [JobStatus.PAYMENT_UNKNOWN]: [JobStatus.PAYMENT_SUCCESS, JobStatus.PAYMENT_FAILED, JobStatus.AWAITING_PAYMENT],
  [JobStatus.PAYMENT_SUCCESS]: [JobStatus.CLEANUP_PENDING],
  [JobStatus.CLEANUP_PENDING]: [JobStatus.FILES_DELETED, JobStatus.CLEANUP_FAILED],
  [JobStatus.CLEANUP_FAILED]: [JobStatus.CLEANUP_PENDING, JobStatus.FILES_DELETED], // Retry cleanup
  [JobStatus.FILES_DELETED]: [JobStatus.JOB_CLOSED],
  [JobStatus.JOB_CLOSED]: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_JOB_TRANSITIONS[from]?.includes(to) ?? false;
}
