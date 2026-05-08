import { DemoCTABanner } from '@/components/demo/DemoCTABanner';
import { RetailDashboard } from '@/components/domains/RetailDashboard';
export const metadata = { title: 'Retail Demo | VistaraBI', description: 'Retail analytics demo' };
export default function Page() { return (<><RetailDashboard /><DemoCTABanner demoDomain='Retail' /></>); }
