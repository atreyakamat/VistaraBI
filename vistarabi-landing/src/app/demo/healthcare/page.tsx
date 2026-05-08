import { DemoCTABanner } from '@/components/demo/DemoCTABanner';
import { HealthcareDashboard } from '@/components/domains/HealthcareDashboard';
export const metadata = { title: 'Healthcare Demo | VistaraBI', description: 'Healthcare analytics demo' };
export default function Page() { return (<><HealthcareDashboard /><DemoCTABanner demoDomain='Healthcare' /></>); }
