import { Sparkles } from "lucide-react";

interface Props {
  title: string;
  hint?: string;
}

const ComingSoon = ({ title, hint }: Props) => (
  <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20">
    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
      <Sparkles size={20} className="text-amber-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-100 mb-1">{title}</h3>
    <p className="text-xs text-slate-500 max-w-md">{hint || "This module is on the roadmap. The screen will appear here once it lands."}</p>
  </div>
);

export default ComingSoon;
