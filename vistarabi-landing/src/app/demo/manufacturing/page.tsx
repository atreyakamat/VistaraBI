import { DemoCTABanner } from '@/components/demo/DemoCTABanner';
import { ManufacturingDashboard } from '@/components/domains/ManufacturingDashboard';
export const metadata = { title: 'Manufacturing Demo | VistaraBI', description: 'Manufacturing analytics demo' };
export default function Page() { return (<><ManufacturingDashboard /><DemoCTABanner demoDomain='Manufacturing' /></>); }
