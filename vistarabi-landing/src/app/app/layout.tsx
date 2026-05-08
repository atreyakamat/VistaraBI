import { SessionGuard } from '@/components/auth/SessionGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return <SessionGuard>{children}</SessionGuard>;
}
