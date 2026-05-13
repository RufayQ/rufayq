<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
interface Props {
  onClick: () => void;
}

const DischargeAlertBanner = ({ onClick }: Props) => (
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
interface DischargeAlertBannerProps {
  onClick: () => void;
}

const DischargeAlertBanner = ({ onClick }: DischargeAlertBannerProps) => (
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
  <button
    onClick={onClick}
    className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left stagger-2 card-press"
    style={{ background: "var(--gold-pale)", borderLeft: "3px solid var(--gold)" }}
  >
    <span className="text-xl">📋</span>
    <div className="flex-1">
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
      <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>Discharge Pack Ready</p>
      <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>حزمة الخروج جاهزة — اضغط لعرضها</p>
    </div>
    <span className="text-lg" style={{ color: "var(--gold)" }}>›</span>
=======
      <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>Keep your medical travel documents ready</p>
      <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>احتفظ بوثائق رحلتك العلاجية جاهزة</p>
    </div>
>>>>>>> theirs
=======
      <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>Keep your medical travel documents ready</p>
      <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>احتفظ بوثائق رحلتك العلاجية جاهزة</p>
    </div>
>>>>>>> theirs
=======
      <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>Keep your medical travel documents ready</p>
      <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>احتفظ بوثائق رحلتك العلاجية جاهزة</p>
    </div>
>>>>>>> theirs
  </button>
);

export default DischargeAlertBanner;
