import Link from "next/link";

const legalLinks = [
  { href: "/legal/user-agreement", label: "用户协议" },
  { href: "/legal/privacy-policy", label: "隐私政策" },
  { href: "/legal/health-data", label: "健康数据说明" },
  { href: "/legal/disclaimer", label: "非医疗诊断免责声明" },
  { href: "/legal/data-deletion", label: "数据删除说明" },
  { href: "/legal/data-export", label: "数据导出说明" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-[220px_1fr]">
      <aside className="rounded-lg border bg-card p-4 md:sticky md:top-6 md:h-fit">
        <Link href="/" className="mb-4 block font-semibold">
          家庭陪伴平台
        </Link>
        <nav className="grid gap-2 text-sm">
          {legalLinks.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <article className="prose prose-neutral max-w-none rounded-lg border bg-card p-6">{children}</article>
    </main>
  );
}
