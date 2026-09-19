import { Injectable } from '@nestjs/common';
import { PrintOptions, PricingSnapshot, ShopPricingRules } from '@secureprint/shared-types';

@Injectable()
export class PricingService {
  calculate(
    options: PrintOptions,
    pageCount: number,
    rules: Partial<ShopPricingRules>,
  ): PricingSnapshot {
    const rateBw = rules.ratePerBwPage ?? 2.0;
    const rateColor = rules.ratePerColorPage ?? 10.0;
    const a3Mult = rules.rateA3Multiplier ?? 2.0;
    const legalMult = rules.rateLegalMultiplier ?? 1.2;
    const duplexDiscount = rules.duplexDiscountPercent ?? 10;
    const minOrder = rules.minimumOrderAmount ?? 2.0;
    const currency = rules.currency ?? 'INR';

    // Parse page range if specified (e.g. "1-5", "2, 4-6", etc.)
    let actualPagesToPrint = pageCount;
    if (options.pageRange && options.pageRange.trim().toLowerCase() !== 'all') {
      actualPagesToPrint = this.countPagesInRange(options.pageRange, pageCount);
    }
    if (actualPagesToPrint < 1) actualPagesToPrint = 1;

    const copies = Math.max(1, options.copies || 1);
    const isColor = options.colorMode === 'COLOR';

    let baseRate = isColor ? rateColor : rateBw;

    // Apply paper size multiplier
    if (options.paperSize === 'A3') {
      baseRate *= a3Mult;
    } else if (options.paperSize === 'LEGAL') {
      baseRate *= legalMult;
    }

    // Apply duplex discount factor if printed on both sides
    const isDuplex = options.duplex !== 'NONE';
    const duplexMultiplier = isDuplex ? 1 - duplexDiscount / 100 : 1.0;

    const totalPagesPrinted = actualPagesToPrint * copies;
    const subtotal = totalPagesPrinted * baseRate * duplexMultiplier;
    const finalAmount = Math.max(minOrder, Math.round(subtotal * 100) / 100);

    return {
      calculatedAt: new Date().toISOString(),
      currency,
      bwPageCount: isColor ? 0 : actualPagesToPrint,
      colorPageCount: isColor ? actualPagesToPrint : 0,
      totalPageCount: totalPagesPrinted,
      copies,
      ratePerBwPage: rateBw,
      ratePerColorPage: rateColor,
      duplexMultiplier,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: 0.0,
      finalAmount,
    };
  }

  private countPagesInRange(rangeStr: string, maxPages: number): number {
    const selected = new Set<number>();
    const parts = rangeStr.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.max(1, start); p <= Math.min(maxPages, end); p++) {
            selected.add(p);
          }
        }
      } else {
        const page = parseInt(trimmed, 10);
        if (!isNaN(page) && page >= 1 && page <= maxPages) {
          selected.add(page);
        }
      }
    }

    return selected.size > 0 ? selected.size : maxPages;
  }
}
