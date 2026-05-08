import { DemoCTABanner } from '@/components/demo/DemoCTABanner';
import { SaaSDashboard } from '@/components/domains/SaaSDashboard';
export const metadata = { title: 'SaaS Demo | VistaraBI', description: 'SaaS analytics demo' };
export default function Page() { return (<><SaaSDashboard /><DemoCTABanner demoDomain='SaaS' /></>); }
