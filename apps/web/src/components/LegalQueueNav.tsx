import Link from "next/link";

export default function LegalQueueNav() {
    return (
        <nav className="mb-6">
            <ul className="flex gap-4">
                <li>
                    <Link href="/legal" className="text-blue-600 hover:underline">Legal Queue</Link>
                </li>
                <li>
                    <Link href="/cases" className="text-blue-600 hover:underline">Cases</Link>
                </li>
            </ul>
        </nav>
    );
}
