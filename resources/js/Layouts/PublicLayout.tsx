import { type ReactNode } from 'react';
import SiteNavbar from '../Components/SiteNavbar';

export default function PublicLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <SiteNavbar />
            {children}
        </>
    );
}
