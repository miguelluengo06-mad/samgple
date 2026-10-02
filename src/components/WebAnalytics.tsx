'use client';

import { Analytics } from '@vercel/analytics/next';
import { filterAnalyticsEvent } from '@/lib/analyticsFilter';

/** Vercel Web Analytics en toda la web: visitas y páginas vistas anónimas, sin cookies. */
export default function WebAnalytics() {
  return <Analytics beforeSend={(event) => filterAnalyticsEvent(event)} />;
}
