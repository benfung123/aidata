// Adapter registry: maps series-code prefixes to adapters.
import type { Adapter } from '../lib/types';
import { hkmaHibor } from './hkma-hibor';
import { onsUkGdp } from './ons-uk-gdp';
import { onsUkUnemployment } from './ons-uk-unemployment';
import { csdHkGdp } from './csd-hk-gdp';
import { csdHkUnemployment } from './csd-hk-unemployment';
import { csdHkRetail } from './csd-hk-retail';
import { singstatSgGdp } from './singstat-sg-gdp';
import { momSgUnemployment } from './mom-sg-unemployment';
import { boeUkRates } from './boe-uk-rates';
import { masSgSora } from './mas-sg-sora';
import { landsdHkLandTransactions } from './landsd-hk-land-transactions';

export const adapters: Adapter[] = [
  hkmaHibor,
  onsUkGdp,
  onsUkUnemployment,
  csdHkGdp,
  csdHkUnemployment,
  csdHkRetail,
  singstatSgGdp,
  momSgUnemployment,
  boeUkRates,
  masSgSora,
  landsdHkLandTransactions,
];

export function adapterForCode(code: string): Adapter | undefined {
  return adapters.find((a) => a.codePrefixes.some((p) => code.startsWith(p)));
}
