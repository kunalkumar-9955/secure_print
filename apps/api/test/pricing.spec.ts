import { PricingService } from '../src/modules/pricing/pricing.service';
import { PrintOptions, ShopPricingRules } from '@secureprint/shared-types';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
  });

  const defaultRules: ShopPricingRules = {
    ratePerBwPage: 2.0,
    ratePerColorPage: 10.0,
    rateA3Multiplier: 2.0,
    rateLegalMultiplier: 1.2,
    duplexDiscountPercent: 10,
    minimumOrderAmount: 2.0,
    currency: 'INR',
  };

  it('calculates single-sided B&W document correctly', () => {
    const options: PrintOptions = {
      colorMode: 'BW',
      copies: 1,
      paperSize: 'A4',
      duplex: 'NONE',
      orientation: 'PORTRAIT',
    };

    const snapshot = service.calculate(options, 5, defaultRules);

    expect(snapshot.totalPageCount).toBe(5);
    expect(snapshot.ratePerBwPage).toBe(2.0);
    expect(snapshot.subtotal).toBe(10.0);
    expect(snapshot.finalAmount).toBe(10.0);
  });

  it('applies 10% discount for duplex (two-sided) printing', () => {
    const options: PrintOptions = {
      colorMode: 'BW',
      copies: 1,
      paperSize: 'A4',
      duplex: 'LONG_EDGE',
      orientation: 'PORTRAIT',
    };

    const snapshot = service.calculate(options, 10, defaultRules);

    // 10 pages * 2.0 = 20.0, 10% discount = 18.0
    expect(snapshot.duplexMultiplier).toBe(0.9);
    expect(snapshot.finalAmount).toBe(18.0);
  });

  it('applies full color rate for color documents', () => {
    const options: PrintOptions = {
      colorMode: 'COLOR',
      copies: 2,
      paperSize: 'A4',
      duplex: 'NONE',
      orientation: 'PORTRAIT',
    };

    const snapshot = service.calculate(options, 3, defaultRules);

    // 3 pages * 2 copies = 6 pages * 10 = 60.0
    expect(snapshot.totalPageCount).toBe(6);
    expect(snapshot.finalAmount).toBe(60.0);
  });

  it('applies A3 multiplier (2.0x)', () => {
    const options: PrintOptions = {
      colorMode: 'BW',
      copies: 1,
      paperSize: 'A3',
      duplex: 'NONE',
      orientation: 'PORTRAIT',
    };

    const snapshot = service.calculate(options, 2, defaultRules);

    // 2 pages * (2.0 * 2.0) = 8.0
    expect(snapshot.finalAmount).toBe(8.0);
  });

  it('enforces minimum order amount', () => {
    const options: PrintOptions = {
      colorMode: 'BW',
      copies: 1,
      paperSize: 'A4',
      duplex: 'NONE',
      orientation: 'PORTRAIT',
    };

    const rulesWithHighMin = { ...defaultRules, minimumOrderAmount: 15.0 };
    const snapshot = service.calculate(options, 1, rulesWithHighMin);

    expect(snapshot.subtotal).toBe(2.0);
    expect(snapshot.finalAmount).toBe(15.0);
  });
});
