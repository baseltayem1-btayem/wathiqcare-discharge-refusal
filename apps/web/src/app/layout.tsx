import "../styles/globals.css";
import LegalQueueNav from "../components/LegalQueueNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <LegalQueueNav />
                {children}
            </body>
        </html>
    );
}
