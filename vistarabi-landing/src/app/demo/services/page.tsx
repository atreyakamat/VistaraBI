import { DemoCTABanner } from '@/components/demo/DemoCTABanner';
import { ServicesDashboard } from '@/components/domains/ServicesDashboard';
export const metadata = { title: 'Services Demo | VistaraBI', description: 'Services analytics demo' };
export default function Page() { return (<><ServicesDashboard /><DemoCTABanner demoDomain='Services' /></>); }
