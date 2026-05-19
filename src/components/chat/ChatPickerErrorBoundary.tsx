import { Component, type ReactNode } from "react";
import { toast } from "sonner";

interface Props {
  /** Called so the parent can close/reset the picker after a crash. */
  onReset?: () => void;
  children: ReactNode;
}

interface State {
  crashed: boolean;
}

/**
 * Localised error boundary for the chat attachment picker. When the picker
 * tree throws during render/lifecycle, we suppress the blank screen, fire a
 * bilingual toast with the error cause, and ask the parent to close the
 * picker so the user can keep chatting.
 */
export default class ChatPickerErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[ChatPickerErrorBoundary] picker crashed", error);
    toast.error("Couldn't open records picker · تعذّر فتح منتقي السجلات", {
      description: error?.message ?? String(error),
    });
    queueMicrotask(() => {
      try { this.props.onReset?.(); } catch { /* noop */ }
      this.setState({ crashed: false });
    });
  }

  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}
