import { Dashboard } from './_components/dashboard';

export default function Home(): React.ReactElement {
  return (
    <div className="pt-2">
      <div className="mb-9">
        <p className="font-mono text-xs text-faint">{'// internal tech talks & lunch-and-learns'}</p>
        <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-tight text-ink">
          Tech talks worth a lunch break<span className="text-accent">.</span>
        </h1>
      </div>
      <Dashboard />
    </div>
  );
}
