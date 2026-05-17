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
  background: "#C5965A",
  color: "#06101A",
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
    console.error("[RufayqStartup] React error boundary caught", error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <AppStartupFallback
        title="We hit a startup error"
        message="RufayQ could not finish loading. Reload to try again."
        messageAr="تعذر إكمال تحميل رفيق. أعد التحميل للمحاولة مرة أخرى."
      >
        <button type="button" style={buttonStyle} onClick={() => window.location.reload()}>
          Reload
        </button>
      </AppStartupFallback>
    );
  }
}