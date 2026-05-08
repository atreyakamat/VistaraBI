import { DemoCTABanner } from '@/components/demo/DemoCTABanner';
import { FinanceDashboard } from '@/components/domains/FinanceDashboard';
export const metadata = { title: 'Finance Demo | VistaraBI', description: 'Finance analytics demo' };
export default function Page() { return (<><FinanceDashboard /><DemoCTABanner demoDomain='Finance' /></>); }
