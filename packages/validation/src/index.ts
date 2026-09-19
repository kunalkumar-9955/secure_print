import { z } from 'zod';
import { UserRole, ShopStatus, JobStatus, PaymentMethod, ColorMode, PaperSize, DuplexMode, PageOrientation } from '@secureprint/shared-types';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  address: z.string().optional(),
  phone: z.string().optional(),
  ownerEmail: z.string().email('Invalid owner email address'),
  ownerPassword: z.string().min(6, 'Owner password must be at least 6 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  planId: z.string().uuid().optional(),
});
export type CreateShopInput = z.infer<typeof CreateShopSchema>;

export const StartCustomerSessionSchema = z.object({
  shopSlug: z.string().min(1),
  customerName: z.string().min(1, 'Please enter your name'),
  deviceInfo: z.string().optional(),
});
export type StartCustomerSessionInput = z.infer<typeof StartCustomerSessionSchema>;

export const PrintOptionsSchema = z.object({
  colorMode: z.enum(['BW', 'COLOR'] as const),
  copies: z.number().int().min(1).max(500),
  pageRange: z.string().optional(),
  paperSize: z.enum(['A4', 'A3', 'LEGAL', 'LETTER'] as const),
  duplex: z.enum(['NONE', 'LONG_EDGE', 'SHORT_EDGE'] as const),
  orientation: z.enum(['PORTRAIT', 'LANDSCAPE'] as const),
});
export type PrintOptionsInput = z.infer<typeof PrintOptionsSchema>;

export const AgentPairSchema = z.object({
  pairingCode: z.string().length(6, 'Pairing code must be 6 digits'),
  installationId: z.string().uuid('Invalid installation ID'),
  machineName: z.string().min(1),
  osVersion: z.string().optional(),
  agentVersion: z.string().min(1),
});
export type AgentPairInput = z.infer<typeof AgentPairSchema>;

export const AgentHeartbeatSchema = z.object({
  installationId: z.string().uuid(),
  agentVersion: z.string().optional(),
});
export type AgentHeartbeatInput = z.infer<typeof AgentHeartbeatSchema>;

export const RegisterPrinterSchema = z.object({
  windowsPrinterName: z.string().min(1),
  driverName: z.string().optional(),
  capabilities: z.object({
    supportsColor: z.boolean(),
    supportsDuplex: z.boolean(),
    supportedPaperSizes: z.array(z.string()),
    supportedOrientations: z.array(z.string()),
    resolutionsDpi: z.array(z.number()).optional(),
  }),
  isDefault: z.boolean().optional(),
});
export type RegisterPrinterInput = z.infer<typeof RegisterPrinterSchema>;

export const UpdatePrintAttemptSchema = z.object({
  attemptId: z.string().uuid(),
  status: z.enum(['QUEUED', 'SUBMITTED', 'ACKNOWLEDGED', 'PRINTING', 'COMPLETED', 'FAILED', 'SUBMISSION_UNKNOWN'] as const),
  errorMessage: z.string().optional(),
});
export type UpdatePrintAttemptInput = z.infer<typeof UpdatePrintAttemptSchema>;

export const CreatePaymentOrderSchema = z.object({
  jobId: z.string().uuid(),
});
export type CreatePaymentOrderInput = z.infer<typeof CreatePaymentOrderSchema>;

export const ConfirmCashPaymentSchema = z.object({
  jobId: z.string().uuid(),
});
export type ConfirmCashPaymentInput = z.infer<typeof ConfirmCashPaymentSchema>;

export const ShopPricingRulesSchema = z.object({
  ratePerBwPage: z.number().min(0),
  ratePerColorPage: z.number().min(0),
  rateA3Multiplier: z.number().min(1),
  rateLegalMultiplier: z.number().min(1),
  duplexDiscountPercent: z.number().min(0).max(100),
  minimumOrderAmount: z.number().min(0),
  currency: z.string().default('INR'),
});
export type ShopPricingRulesInput = z.infer<typeof ShopPricingRulesSchema>;
