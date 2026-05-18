import { DemoCTABanner } from '@/components/demo/DemoCTABanner';
import { EdTechDashboardLive } from '@/components/domains/EdTechDashboardLive';
export const metadata = { title: 'EdTech Demo | VistaraBI', description: 'Live EdTech analytics: enrollment, completion, scores, revenue by subject.' };
export default function Page() { return <><EdTechDashboardLive /><DemoCTABanner demoDomain='EdTech' /></>; }
