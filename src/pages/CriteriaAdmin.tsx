import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useCriteria } from "../lib/criteria";
import type { Criterion, Dimension } from "../types/db";

interface DimDraft {
  id?: string;
  key: string;
  name_ar: string;
  weight: number;
  position: number;
  is_active: boolean;
}

export default function CriteriaAdmin() {
  const { rawDimensions, rawCriteria, loading, error, refetch } = useCriteria();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [opError, setOpError] = useState<string>("");
  const [showAddDim, setShowAddDim] = useState(false);
  const [draftDim, setDraftDim] = useState<DimDraft>({
    key: "", name_ar: "", weight: 10, position: 99, is_active: true,
  });

  const sortedDims = useMemo(
    () => [...rawDimensions].sort((a, b) => a.position - b.position),
    [rawDimensions],
  );
  const critsByDim = useMemo(() => {
    const m: Record<string, Criterion[]> = {};
    for (const c of rawCriteria) {
      (m[c.dimension_id] ||= []).push(c);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.position - b.position);
    return m;
  }, [rawCriteria]);

  const totalActiveWeight = useMemo(
    () => rawDimensions.filter((d) => d.is_active).reduce((s, d) => s + Number(d.weight), 0),
    [rawDimensions],
  );

  async function saveDim(d: Dimension, patch: Partial<Dimension>) {
    setSaving(d.id);
    setOpError("");
    const { error: e } = await supabase.from("dimensions").update(patch).eq("id", d.id);
    if (e) setOpError(e.message);
    await refetch();
    setSaving(null);
  }

  async function addDimension() {
    if (!draftDim.key.trim() || !draftDim.name_ar.trim()) {
      setOpError("المفتاح والاسم العربي مطلوبان");
      return;
    }
    if (!(draftDim.weight > 0 && draftDim.weight <= 100)) {
      setOpError("الوزن يجب أن يكون رقمًا بين 1 و 100");
      return;
    }
    setSaving("new-dim");
    setOpError("");
    const { error: e } = await supabase.from("dimensions").insert({
      key: draftDim.key.trim(),
      name_ar: draftDim.name_ar.trim(),
      weight: draftDim.weight,
      position: draftDim.position,
      is_active: draftDim.is_active,
    });
    if (e) {
      setOpError(e.message);
    } else {
      setDraftDim({ key: "", name_ar: "", weight: 10, position: 99, is_active: true });
      setShowAddDim(false);
      await refetch();
    }
    setSaving(null);
  }

  async function deleteDim(d: Dimension) {
    if (!confirm(`حذف المحور "${d.name_ar}" مع جميع معاييره؟ هذا غير قابل للتراجع.`)) return;
    setSaving(d.id);
    setOpError("");
    const { error: e } = await supabase.from("dimensions").delete().eq("id", d.id);
    if (e) setOpError(e.message + " — جرّب التعطيل بدل الحذف إذا كانت هناك تقييمات مرتبطة.");
    await refetch();
    setSaving(null);
  }

  async function saveCrit(c: Criterion, patch: Partial<Criterion>) {
    setSaving(c.id);
    setOpError("");
    const { error: e } = await supabase.from("criteria").update(patch).eq("id", c.id);
    if (e) setOpError(e.message);
    await refetch();
    setSaving(null);
  }

  async function addCrit(dimId: string, nextPos: number) {
    const name = window.prompt("اسم المعيار بالعربية:", "");
    if (!name || !name.trim()) return;
    setSaving(`new-${dimId}`);
    setOpError("");
    const { error: e } = await supabase.from("criteria").insert({
      dimension_id: dimId,
      name_ar: name.trim(),
      position: nextPos,
      is_active: true,
    });
    if (e) setOpError(e.message);
    await refetch();
    setSaving(null);
  }

  async function deleteCrit(c: Criterion) {
    if (!confirm(`حذف المعيار "${c.name_ar}"؟`)) return;
    setSaving(c.id);
    setOpError("");
    const { error: e } = await supabase.from("criteria").delete().eq("id", c.id);
    if (e) setOpError(e.message + " — جرّب التعطيل بدل الحذف إذا كانت هناك درجات مرتبطة.");
    await refetch();
    setSaving(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-navy">معايير التقييم</h2>
          <p className="text-navy/40 text-xs mt-1">
            تُستخدم هذه المحاور والمعايير في صفحة تقييم الحكّام. مجموع الأوزان النشطة:{" "}
            <span
              className={totalActiveWeight === 100 ? "text-green-700" : "text-amber-700"}
              style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800 }}
            >
              {totalActiveWeight}
            </span>
            {totalActiveWeight !== 100 && " (يفضّل أن يساوي 100)"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refetch}
            disabled={loading}
            className="text-xs font-bold text-navy/60 hover:text-navy border border-navy/15 hover:border-navy/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "جارٍ التحديث..." : "↻ تحديث"}
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setShowAddDim((v) => !v);
              setOpError("");
            }}
            className="bg-navy text-white font-bold text-sm px-4 py-1.5 rounded-lg flex items-center gap-2"
          >
            + محور جديد
          </motion.button>
        </div>
      </div>

      {(opError || error) && (
        <div className="text-red-700 text-sm mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          ⚠️ {opError || error}
        </div>
      )}

      <AnimatePresence>
        {showAddDim && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-navy/8 p-5 mb-5"
          >
            <h3 className="font-black text-navy mb-3 text-sm">إضافة محور جديد</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <FieldInput
                label="المفتاح *"
                value={draftDim.key}
                onChange={(v) => setDraftDim({ ...draftDim, key: v })}
                placeholder="مثال: sustainability"
                ltr
              />
              <FieldInput
                label="الاسم بالعربية *"
                value={draftDim.name_ar}
                onChange={(v) => setDraftDim({ ...draftDim, name_ar: v })}
                placeholder="مثال: الاستدامة"
                className="md:col-span-2"
              />
              <FieldInput
                label="الوزن %"
                value={String(draftDim.weight)}
                onChange={(v) => setDraftDim({ ...draftDim, weight: Number(v) || 0 })}
                placeholder="10"
                ltr
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={addDimension}
                disabled={saving === "new-dim"}
                className="bg-navy text-white font-bold text-sm px-5 py-2 rounded-xl disabled:opacity-60"
              >
                {saving === "new-dim" ? "جارٍ الإضافة..." : "إضافة"}
              </button>
              <button
                onClick={() => setShowAddDim(false)}
                className="text-navy/50 hover:text-navy text-sm px-4 py-2 border border-navy/15 rounded-xl"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && sortedDims.length === 0 ? (
        <div className="text-center py-20 text-navy/40">جارٍ التحميل...</div>
      ) : sortedDims.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-navy/8">
          <div className="text-5xl mb-4">📊</div>
          <div className="text-navy/40">لا توجد محاور بعد — أضف أول محور</div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDims.map((d) => {
            const open = expanded === d.id;
            const crits = critsByDim[d.id] ?? [];
            return (
              <div
                key={d.id}
                className={`bg-white rounded-2xl border ${d.is_active ? "border-navy/10" : "border-navy/5 opacity-70"} overflow-hidden`}
              >
                <div className="px-4 md:px-5 py-3 grid grid-cols-1 md:grid-cols-12 gap-3 md:items-center">
                  <div className="md:col-span-1 flex items-center gap-2">
                    <span
                      className="text-navy font-black text-sm bg-navy/5 px-2 py-1 rounded-lg"
                      style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                    >
                      {String(d.position).padStart(2, "0")}
                    </span>
                  </div>
                  <FieldInline
                    className="md:col-span-2"
                    label="المفتاح"
                    value={d.key}
                    onCommit={(v) => v && v !== d.key && saveDim(d, { key: v })}
                    ltr
                  />
                  <FieldInline
                    className="md:col-span-3"
                    label="الاسم"
                    value={d.name_ar}
                    onCommit={(v) => v && v !== d.name_ar && saveDim(d, { name_ar: v })}
                  />
                  <FieldInline
                    className="md:col-span-1"
                    label="الوزن"
                    value={String(d.weight)}
                    onCommit={(v) => {
                      const n = Number(v);
                      if (isNaN(n) || n === Number(d.weight)) return;
                      if (!(n > 0 && n <= 100)) {
                        setOpError("الوزن يجب أن يكون رقمًا بين 1 و 100");
                        return;
                      }
                      saveDim(d, { weight: n });
                    }}
                    ltr
                  />
                  <FieldInline
                    className="md:col-span-1"
                    label="الترتيب"
                    value={String(d.position)}
                    onCommit={(v) => {
                      const n = parseInt(v);
                      if (!isNaN(n) && n !== d.position) saveDim(d, { position: n });
                    }}
                    ltr
                  />
                  <div className="md:col-span-1">
                    <button
                      onClick={() => saveDim(d, { is_active: !d.is_active })}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${d.is_active ? "bg-green-100 text-green-700" : "bg-navy/8 text-navy/50"}`}
                    >
                      {d.is_active ? "نشط" : "موقوف"}
                    </button>
                  </div>
                  <div className="md:col-span-3 flex gap-2 md:justify-end flex-wrap">
                    <button
                      onClick={() => setExpanded(open ? null : d.id)}
                      disabled={saving === d.id}
                      className="text-xs bg-gold text-navy font-bold px-3 py-1.5 rounded-lg hover:brightness-95 disabled:opacity-50"
                    >
                      {open ? "إخفاء المعايير" : `معايير (${crits.length})`}
                    </button>
                    <button
                      onClick={() => deleteDim(d)}
                      disabled={saving === d.id}
                      className="text-xs text-red-500 hover:text-red-700 font-bold border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-cream/60 border-t border-navy/5"
                    >
                      <div className="p-4 md:p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs font-bold text-navy/40 uppercase tracking-widest">
                            معايير {d.name_ar}
                          </div>
                          <button
                            onClick={() => addCrit(d.id, crits.length + 1)}
                            disabled={saving === `new-${d.id}`}
                            className="text-xs bg-navy text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
                          >
                            + معيار
                          </button>
                        </div>
                        {crits.length === 0 ? (
                          <div className="text-center py-6 text-navy/40 text-sm">
                            لا توجد معايير — أضف أول معيار
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {crits.map((c) => (
                              <div
                                key={c.id}
                                className={`bg-white rounded-xl border ${c.is_active ? "border-navy/8" : "border-navy/5 opacity-70"} px-3 py-2 grid grid-cols-1 md:grid-cols-12 gap-2 md:items-center`}
                              >
                                <FieldInline
                                  className="md:col-span-7"
                                  label="الاسم"
                                  value={c.name_ar}
                                  onCommit={(v) => v && v !== c.name_ar && saveCrit(c, { name_ar: v })}
                                />
                                <FieldInline
                                  className="md:col-span-2"
                                  label="الترتيب"
                                  value={String(c.position)}
                                  onCommit={(v) => {
                                    const n = parseInt(v);
                                    if (!isNaN(n) && n !== c.position) saveCrit(c, { position: n });
                                  }}
                                  ltr
                                />
                                <div className="md:col-span-1">
                                  <button
                                    onClick={() => saveCrit(c, { is_active: !c.is_active })}
                                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.is_active ? "bg-green-100 text-green-700" : "bg-navy/8 text-navy/50"}`}
                                  >
                                    {c.is_active ? "نشط" : "موقوف"}
                                  </button>
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                  <button
                                    onClick={() => deleteCrit(c)}
                                    disabled={saving === c.id}
                                    className="text-xs text-red-500 hover:text-red-700 font-bold border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg disabled:opacity-50"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FieldInput({
  label, value, onChange, placeholder, className = "", ltr = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; className?: string; ltr?: boolean;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-bold text-navy/50 mb-1 uppercase tracking-widest">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={ltr ? "ltr" : undefined}
        className="w-full border border-navy/15 rounded-lg px-3 py-2 text-navy text-sm focus:outline-none focus:border-navy bg-cream/50"
      />
    </div>
  );
}

function FieldInline({
  label, value, onCommit, className = "", ltr = false,
}: {
  label: string; value: string; onCommit: (v: string) => void;
  className?: string; ltr?: boolean;
}) {
  const [local, setLocal] = useState(value);
  // Re-sync the editable buffer when the parent's authoritative value changes
  // (e.g. after a successful save). This is the canonical controlled→local
  // sync pattern.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setLocal(value), [value]);
  return (
    <div className={className}>
      <label className="block text-[10px] font-bold text-navy/40 mb-0.5 uppercase tracking-widest">{label}</label>
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onCommit(local.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setLocal(value);
        }}
        dir={ltr ? "ltr" : undefined}
        className="w-full border border-navy/10 hover:border-navy/25 focus:border-navy rounded-lg px-2.5 py-1.5 text-navy text-sm focus:outline-none bg-white"
      />
    </div>
  );
}
