import { DemoCTABanner } from '@/components/demo/DemoCTABanner';
import { HealthcareDashboardLive } from '@/components/domains/HealthcareDashboardLive';
export const metadata = { title: 'Healthcare Demo | VistaraBI', description: 'Live healthcare analytics: patient outcomes, LOS, satisfaction, readmission.' };
export default function Page() { return <><HealthcareDashboardLive /><DemoCTABanner demoDomain='Healthcare' /></>; }
