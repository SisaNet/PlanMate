import Link from "next/link"
import {
  CheckCircle2,
  Shield,
  Building2,
  FileCheck,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200/60 bg-white/80 backdrop-blur-xl dark:border-neutral-800/60 dark:bg-neutral-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-semibold tracking-tight">
              PlanMate
            </span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white">
              How it works
            </a>
            <a href="#pricing" className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="rounded-full px-5">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-100/40 blur-3xl dark:bg-blue-900/20" />
        </div>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            Built for South African architectural professionals
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-neutral-900 md:text-6xl lg:text-7xl dark:text-white">
            Submit right,{" "}
            <span className="text-blue-600">first time.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-neutral-500 md:text-xl dark:text-neutral-400">
            PlanMate checks your building plan submission against all 265
            municipality requirements in South Africa. No more rejections from
            missing documents or overlooked requirements.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="h-12 rounded-full px-8 text-base shadow-lg shadow-blue-500/20">
                Start checking for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="h-12 rounded-full px-8 text-base">
                See how it works
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-neutral-400">
            Free for up to 5 projects. No credit card required.
          </p>
        </div>
      </section>

      {/* Compliance Standards */}
      <section className="border-y border-neutral-100 bg-neutral-50/50 py-12 dark:border-neutral-800 dark:bg-neutral-900/50">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-6 text-xs font-medium uppercase tracking-widest text-neutral-400">
            Designed for compliance with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-neutral-400 md:gap-12">
            <span>NBR Act 103/1977</span>
            <span className="hidden h-4 w-px bg-neutral-200 dark:bg-neutral-700 md:block" />
            <span>SANS 10400</span>
            <span className="hidden h-4 w-px bg-neutral-200 dark:bg-neutral-700 md:block" />
            <span>265 Municipalities</span>
            <span className="hidden h-4 w-px bg-neutral-200 dark:bg-neutral-700 md:block" />
            <span>SACAP Registered</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl dark:text-white">
              Everything you need to submit with confidence
            </h2>
            <p className="mx-auto max-w-2xl text-neutral-500 dark:text-neutral-400">
              From compliance checklists to risk flags, PlanMate covers every
              aspect of building plan submission requirements.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: MapPin, title: "Municipality Selector", description: "Search any of 265 SA municipalities by city or town name. Get the exact requirements for your project location." },
              { icon: FileCheck, title: "Compliance Checklist", description: "Auto-generated checklist with every document, drawing, and form required for your specific project and municipality." },
              { icon: Shield, title: "Risk Flag Engine", description: "Automatically detects dolomite, coastal, heritage, and other risk conditions before you start designing." },
              { icon: Building2, title: "Technical Parameters", description: "Building lines, coverage, height limits, and FAR for your zone with instant pass/fail checks." },
              { icon: Clock, title: "Deadline Tracker", description: "Track plan validity, inspection stages, and approval timeframes across all your projects." },
              { icon: CheckCircle2, title: "Drawing Set Checker", description: "Per-drawing checklist with municipality-specific format requirements and SACAP standards." },
            ].map((feature, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-neutral-200/50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:shadow-neutral-900/50"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
                  <feature.icon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="mb-2 font-semibold dark:text-white">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-neutral-100 bg-neutral-50/50 py-24 md:py-32 dark:border-neutral-800 dark:bg-neutral-900/30">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl dark:text-white">
              Three steps to compliance
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400">
              Get your personalised compliance report in under 10 minutes.
            </p>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            {[
              { step: "01", title: "Select your municipality", description: "Choose from all 265 South African municipalities. Search by city, town, or suburb name." },
              { step: "02", title: "Enter project details", description: "Building type, size, zoning, and location. Our wizard guides you through conditional requirements." },
              { step: "03", title: "Get your checklist", description: "Receive a complete, personalised compliance checklist with risk flags, technical parameters, and portal links." },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-500/20">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold dark:text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl dark:text-white">Simple, transparent pricing</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Start free, upgrade when you need more.</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="mb-1 text-lg font-semibold dark:text-white">Free</h3>
              <p className="mb-6 text-sm text-neutral-500">For individual practitioners getting started</p>
              <div className="mb-6">
                <span className="text-4xl font-bold dark:text-white">R0</span>
                <span className="text-neutral-400">/month</span>
              </div>
              <ul className="mb-8 space-y-3 text-sm">
                {["Up to 5 projects", "Full compliance checklist", "Risk flag detection", "Technical parameters", "Municipality portal links"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-neutral-600 dark:text-neutral-300">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block">
                <Button variant="outline" className="w-full rounded-full">Get started free</Button>
              </Link>
            </div>
            {/* Professional */}
            <div className="relative rounded-2xl border-2 border-blue-600 bg-white p-8 shadow-xl shadow-blue-500/10 dark:bg-neutral-900">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-medium text-white">
                Most popular
              </div>
              <h3 className="mb-1 text-lg font-semibold dark:text-white">Professional</h3>
              <p className="mb-6 text-sm text-neutral-500">For practices and teams</p>
              <div className="mb-6">
                <span className="text-4xl font-bold dark:text-white">R499</span>
                <span className="text-neutral-400">/month</span>
              </div>
              <ul className="mb-8 space-y-3 text-sm">
                {["Unlimited projects", "PDF compliance reports", "Practice branding", "Up to 20 team members", "Drawing set checker", "Energy & fees calculators", "Deadline tracker & alerts", "AI compliance assistant", "Document storage (1GB/project)", "Priority support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    <span className="text-neutral-600 dark:text-neutral-300">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register?plan=professional" className="block">
                <Button className="w-full rounded-full">Start 14-day free trial</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-100 bg-neutral-50/50 py-24 dark:border-neutral-800 dark:bg-neutral-900/30">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl dark:text-white">
            Stop guessing. Start submitting right.
          </h2>
          <p className="mb-8 text-neutral-500 dark:text-neutral-400">
            Join architects across South Africa who are eliminating preventable building plan rejections.
          </p>
          <Link href="/register">
            <Button size="lg" className="h-12 rounded-full px-8 text-base shadow-lg shadow-blue-500/20">
              Get started for free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-12 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">PlanMate</span>
            </div>
            <p className="text-sm text-neutral-400">
              &copy; {new Date().getFullYear()} PlanMate. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
