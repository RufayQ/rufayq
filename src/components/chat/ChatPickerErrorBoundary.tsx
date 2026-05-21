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
  * Localised error boundary for the records picker. When the picker tree
  * throws during render/lifecycle, keep the sheet area mounted and offer a
  * local retry instead of closing the menu (closing was the unstable WebView
  * path users experienced as the picker "disappearing").
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
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55" role="alert">
          <div className="w-full max-w-[420px] rounded-t-3xl p-5 text-center" style={{ background: "var(--white)", color: "var(--navy)" }}>
            <p className="font-display text-lg">Records picker recovered</p>
            <p className="font-arabic text-sm mt-1" dir="rtl" style={{ color: "var(--gray)" }}>تم احتواء خطأ منتقي السجلات</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => this.setState({ crashed: false })}
                className="flex-1 rounded-full px-4 py-2 text-[12px] font-bold btn-press"
                style={{ background: "var(--teal-deep)", color: "white" }}
              >
                Try again · <span className="font-arabic">إعادة المحاولة</span>
              </button>
              <button
                onClick={this.props.onReset}
                className="flex-1 rounded-full px-4 py-2 text-[12px] font-bold btn-press"
                style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
              >
                Close · <span className="font-arabic">إغلاق</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
