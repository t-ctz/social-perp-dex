import { Component, ReactNode } from "react";

interface Props { name: string; children: ReactNode }
interface State { err: Error | null }

/** Isolates a widget: if it throws, show the real error instead of blanking the page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };
  static getDerivedStateFromError(err: Error): State { return { err }; }
  componentDidCatch(err: Error) { console.error(`[${this.props.name}]`, err); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="m-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
        <div className="font-semibold">{this.props.name} crashed</div>
        <div className="mt-1 break-words font-mono text-[11px]">{String(this.state.err.message || this.state.err).slice(0, 300)}</div>
        <button className="mt-2 rounded bg-white/10 px-2 py-1 text-zinc-100 hover:bg-white/20" onClick={() => this.setState({ err: null })}>Retry</button>
      </div>
    );
  }
}
