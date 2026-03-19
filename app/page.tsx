import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { Users, Receipt, PieChart, Shield, ArrowRight, Wallet, CheckCircle2, Zap, Globe } from "lucide-react";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">LedgerNest</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-20 md:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Smart personal and shared finance management
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
              Track money.{" "}
              <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                Build wealth.
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground md:text-xl">
              Manage expenses, income sources, investments, liabilities, budgets,
              and savings goals in one powerful workspace.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
              >
                Start for Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border bg-card px-8 py-3.5 text-base font-semibold transition-colors hover:bg-accent"
              >
                Sign in to your account
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-20 grid max-w-2xl grid-cols-3 gap-8">
            {[
              { value: "100%", label: "Free to use" },
              { value: "4+", label: "Split methods" },
              { value: "All-in-one", label: "Finance tracking" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-primary md:text-3xl">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-card/50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Everything you need to manage complete finances
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed to make expense tracking effortless.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Shared Expenses",
                desc: "Create unlimited groups for trips, roommates, teams, or any shared expense scenario.",
              },
              {
                icon: Receipt,
                title: "Personal Expense Hub",
                desc: "Track daily personal spending with categories, notes, and budget controls.",
              },
              {
                icon: PieChart,
                title: "Income & Cashflow",
                desc: "Record all incoming sources and understand monthly inflow vs outflow instantly.",
              },
              {
                icon: Shield,
                title: "Investments & Net Worth",
                desc: "Track portfolio value, gain/loss, liabilities, and your overall net worth journey.",
              },
              {
                icon: Globe,
                title: "Savings Goals",
                desc: "Create financial goals, add contributions, and monitor completion progress.",
              },
              {
                icon: Zap,
                title: "Secure & Reliable",
                desc: "Email verification, encrypted passwords, and secure sessions keep your data safe.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started in 3 simple steps.
            </p>
          </div>

          <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Set Up Your Finance Hub",
                desc: "Add your income sources, budgets, and money categories in minutes.",
              },
              {
                step: "2",
                title: "Track All Money Movement",
                desc: "Log expenses, investments, liabilities, and savings progress as you go.",
              },
              {
                step: "3",
                title: "Review Insights",
                desc: "Watch cashflow trends and make smarter financial decisions every month.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-card/50 py-20">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Ready to take full control of your money?
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-lg text-muted-foreground">
            Join LedgerNest and manage your complete financial life from one dashboard.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
          >
            Create Your Free Account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-semibold">LedgerNest</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} LedgerNest. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
