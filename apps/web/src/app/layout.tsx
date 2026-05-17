import "../styles/globals.css";
import LegalQueueNav from "../components/LegalQueueNav";
import I18nProvider from "@/i18n/I18nProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" data-scroll-behavior="smooth" className="scroll-smooth">
            <body>
                <I18nProvider>
                    <LegalQueueNav />
                    {children}
                </I18nProvider>
            </body>
        </html>
    );
}
