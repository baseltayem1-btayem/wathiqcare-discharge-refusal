import PrototypeShell from "@/components/prototype/PrototypeShell";

export const metadata = {
  title: "Prototype Lab",
  description: "24-Hour Acceleration Mode prototype surfaces",
};

export default function PrototypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PrototypeShell>{children}</PrototypeShell>;
}
