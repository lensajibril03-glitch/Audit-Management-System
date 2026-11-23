import Link from "next/link";

type Props = {
  title: string;
  value: number;
  subtitle: string;
  href: string;
};

export default function KpiCard({ title, value, subtitle, href }: Props) {
  return (
    <Link href={href} className="app-card block p-4 hover:shadow-sm">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted">{subtitle}</p>
    </Link>
  );
}
