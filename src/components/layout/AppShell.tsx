"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HeartPulse, Home, LogOut, MailCheck, User, Users, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const navItems = [
  { href: "/dashboard", label: "工作台", icon: Home },
  { href: "/families", label: "家庭", icon: Users },
  { href: "/invitations", label: "邀请", icon: MailCheck },
  { href: "/profile", label: "个人资料", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HeartPulse className="size-4" />
            </span>
            家庭陪伴平台
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 size-4" />
            退出
          </Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[180px_1fr]">
        <aside className="min-w-0 md:sticky md:top-20 md:h-fit">
          <nav className="grid gap-3 md:gap-1">
            <div className="flex gap-1 overflow-x-auto pb-1 md:grid md:overflow-visible md:pb-0">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-foreground " +
                      (isActive ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground")
                    }
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 rounded-md border bg-card p-3 text-xs text-muted-foreground">
              <UserRoundCog className="mb-2 size-4 text-primary" />
              当前聚焦家庭档案、健康数据和基础报告。
            </div>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
