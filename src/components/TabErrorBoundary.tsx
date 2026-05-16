import { Component, type ReactNode } from "react";

interface Props {
  /** Stable key for the currently rendered tab. When it changes, the boundary
   *  resets so a previously-crashed tab can be retried after the user navigates
   *  away and back. */
  tabKey: string;
  /** Called when the rendered child throws during render/lifecycle. Parent
   *  should restore the last working tab and surface a toast. */
  onError: (tabKey: string, error: Error) => void;
  children: ReactNode;
}

interface State {
  failedKey: string | null;
}

/**
 * Localised error boundary for the main shell's tab content. We don't render
 * a fallback UI — instead we notify the parent (Index.tsx) which restores the
 * previous tab and shows a friendly bilingual toast, so the user never sees a
 * blank screen.
 */
export default class TabErrorBoundary extends Component<Props, State> {
  state: State = { failedKey: null };

  static getDerivedStateFromError(): Partial<State> {
    return {};
  }

  componentDidCatch(error: Error) {
    if (this.state.failedKey === this.props.tabKey) return;
    this.setState({ failedKey: this.props.tabKey });
    // Defer to next tick so React can finish the unmount cleanly before the
    // parent swaps the tab back.
    queueMicrotask(() => this.props.onError(this.props.tabKey, error));
  }

  componentDidUpdate(prev: Props) {
    if (prev.tabKey !== this.props.tabKey && this.state.failedKey) {
      this.setState({ failedKey: null });
    }
  }

  render() {
    if (this.state.failedKey === this.props.tabKey) return null;
    return this.props.children;
  }
}
