import { DemoCTABanner } from '@/components/demo/DemoCTABanner';
import { EdTechDashboard } from '@/components/domains/EdTechDashboard';
export const metadata = { title: 'EdTech Demo | VistaraBI', description: 'EdTech analytics demo' };
export default function Page() { return (<><EdTechDashboard /><DemoCTABanner demoDomain='EdTech' /></>); }
