import "../styles/globals.css";
import LegalQueueNav from "../components/LegalQueueNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" data-scroll-behavior="smooth" className="scroll-smooth">
            <body>
                <LegalQueueNav />
                {children}
            </body>
        </html>
    );
}
