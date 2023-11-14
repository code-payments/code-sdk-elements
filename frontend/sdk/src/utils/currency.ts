import * as flags from './flags';
import { currencyCodeToRegion } from '@code-wallet/library';

function formatCurrency(value: number | bigint, currency: any = 'usd', locale: string | string[] = 'en-US') {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });

  return formatter.format(value).replace(/^[A-z]+\s*/g, '');
}

function flagForCurrency(currency: any) {
  const region = currencyCodeToRegion(currency);
  if (!region) {
    return;
  }
  const flag = flags[region.substring(0, 2).toLowerCase()];
  if (flag) {
    return flag;
  }
}

export {
 formatCurrency,
 flagForCurrency,
}