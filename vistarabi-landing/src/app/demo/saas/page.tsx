import { DemoCTABanner } from '@/components/demo/DemoCTABanner';
import { SaaSDashboardLive } from '@/components/domains/SaaSDashboardLive';
export const metadata = { title: 'SaaS Demo | VistaraBI', description: 'Live SaaS analytics: MRR, ARR, churn, CAC, LTV and more.' };
export default function Page() { return <><SaaSDashboardLive /><DemoCTABanner demoDomain='SaaS' /></>; }
