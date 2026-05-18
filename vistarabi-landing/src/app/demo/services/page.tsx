import { DemoCTABanner } from '@/components/demo/DemoCTABanner';
import { ServicesDashboardLive } from '@/components/domains/ServicesDashboardLive';
export const metadata = { title: 'Services Demo | VistaraBI', description: 'Live professional services analytics: utilisation, margins, client satisfaction.' };
export default function Page() { return <><ServicesDashboardLive /><DemoCTABanner demoDomain='Services' /></>; }
