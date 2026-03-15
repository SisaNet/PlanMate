import { Building2 } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-neutral-950 p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <Building2 className="h-7 w-7 text-blue-500" />
          <span className="text-xl font-semibold text-white">PlanMate</span>
        </Link>
        <div>
          <blockquote className="space-y-4">
            <p className="text-2xl font-medium leading-relaxed text-white/90">
              &ldquo;PlanMate saved us from a costly rejection on a Tshwane
              project. The dolomite risk flag caught something we completely
              missed.&rdquo;
            </p>
            <footer className="text-sm text-white/50">
              &mdash; SACAP Registered Architect, Gauteng
            </footer>
          </blockquote>
        </div>
        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} PlanMate. All rights reserved.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
