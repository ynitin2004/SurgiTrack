import { Activity, Gift, LineChart, ShieldCheck } from 'lucide-react';

const FEATURES = [
  { icon: LineChart, title: 'Live surgery analytics', text: 'Totals, trends and surgeon rankings that update the moment a case is recorded.' },
  { icon: ShieldCheck, title: 'Role-based access', text: 'Admins see the whole programme; surgeons see only their own cases.' },
  { icon: Gift, title: 'Trophy rewards', text: 'Trophy badges and customised gifts at 50, 100, 200, 500 and 1,000 surgeries.' },
];

// Split-screen frame for the login and registration pages.
export default function AuthShell({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="bg-hero relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <span className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10" aria-hidden />
        <span className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
            <Activity size={22} aria-hidden />
          </div>
          <span className="text-xl font-extrabold">SurgiTrack</span>
        </div>
        <div className="relative mt-auto max-w-md">
          <h1 className="text-4xl leading-tight font-extrabold">Every robotic case, every surgeon — live.</h1>
          <ul className="mt-10 space-y-6">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="h-fit rounded-xl bg-white/15 p-2.5">
                  <f.icon size={18} aria-hidden />
                </span>
                <span>
                  <span className="block font-bold">{f.title}</span>
                  <span className="block text-sm text-white/80">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">{children}</main>
    </div>
  );
}
