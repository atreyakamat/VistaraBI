import { DemoCTABanner } from '@/components/demo/DemoCTABanner';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <DemoCTABanner />
        </>
    );
}
