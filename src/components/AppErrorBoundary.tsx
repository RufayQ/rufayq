import { Component, type ErrorInfo, type ReactNode } from "react";
import AppStartupFallback from "@/components/AppStartupFallback";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const buttonStyle = {
  border: "1px solid rgba(197,150,90,0.55)",
  background: "var(--gold, #C5965A)",
  color: "var(--scanner-bg, #06101A)",
  borderRadius: 999,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 700,
};

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Detailed marker for adb/logcat + Lovable console.
    console.error("[RufayqStartup] ErrorBoundary rendered", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const err = this.state.error;

    return (
      <AppStartupFallback
        title="We hit a startup error"
        message={`RufayQ could not finish loading. Reload to try again. (${err.name}: ${err.message})`}
        messageAr="تعذر إكمال تحميل رفيق. أعد التحميل للمحاولة مرة أخرى."
      >
        <button type="button" style={buttonStyle} onClick={() => window.location.reload()}>
          Reload
        </button>
      </AppStartupFallback>
    );
  }
}
