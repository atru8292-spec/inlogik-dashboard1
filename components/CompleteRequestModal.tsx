"use client";

import { useState } from "react";
import { ClipboardList, X, Send } from "lucide-react";
import type { RequestRow } from "@/lib/queries";

const TRANSPORT_OPTIONS = [
  { value: "sea", label: "🚢 Море" },
  { value: "auto", label: "🚛 Авто" },
  { value: "rail", label: "🚂 ЖД" },
  { value: "air", label: "✈️ Авиа" },
  { value: "assembly", label: "📦 Авто-сборный" },
];

const INCOTERMS_OPTIONS = ["FOB", "EXW", "CIF", "CFR", "DAP", "DDP", "FCA", "CPT"];
const CONTAINER_OPTIONS = ["20DC", "40HC", "40HQ", "LCL", "LTL"];

export function CompleteRequestModal({
  request,
  onClose,
  onSaved,
}: {
  request: RequestRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    transport_mode: request.ai_transport_mode || "",
    origin_city: request.ai_origin_city || "",
    origin_country: request.ai_origin_country || "",
    dest_city: request.ai_dest_city || "",
    dest_country: request.ai_dest_country || "",
    cargo_name: request.ai_cargo_name || "",
    incoterms: request.ai_incoterms || "",
    container_type: request.ai_container_type || "",
    weight_kg: request.ai_weight_kg ? String(request.ai_weight_kg) : "",
    volume_cbm: request.ai_volume_cbm ? String(request.ai_volume_cbm) : "",
    note: "",
  });

  const missingFields = request.ai_missing_fields?.length
    ? request.ai_missing_fields
    : request.last_error?.replace("incomplete_data:", "").trim().split(",").map(s => s.trim()).filter(Boolean) || [];

  const set = (key: string, val: string) => setFields(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/requests/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: request.id, fields }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Ошибка");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-violet-500" />
            <div>
              <h2 className="font-semibold text-slate-900">Дополнить данные</h2>
              <p className="text-xs text-slate-500">REQ-{request.request_code} · {request.customer}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Missing fields banner */}
        {missingFields.length > 0 && (
          <div className="mx-6 mt-4 px-4 py-2.5 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-700">
            <span className="font-medium">Не хватает:</span> {missingFields.join(", ")}
          </div>
        )}

        {/* Form */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Transport */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Тип транспорта</label>
            <div className="flex gap-2 flex-wrap">
              {TRANSPORT_OPTIONS.map(o => (
                <button key={o.value} onClick={() => set("transport_mode", o.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                    fields.transport_mode === o.value
                      ? "bg-violet-500 text-white border-violet-500"
                      : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Route */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Откуда (город)</label>
              <input value={fields.origin_city} onChange={e => set("origin_city", e.target.value)}
                placeholder="Шанхай / Arzignano" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Страна отправления</label>
              <input value={fields.origin_country} onChange={e => set("origin_country", e.target.value)}
                placeholder="CN / IT / TR" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Куда (город)</label>
              <input value={fields.dest_city} onChange={e => set("dest_city", e.target.value)}
                placeholder="Москва / Клин" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Страна назначения</label>
              <input value={fields.dest_country} onChange={e => set("dest_country", e.target.value)}
                placeholder="RU / KZ" className="input-field w-full" />
            </div>
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Груз</label>
            <input value={fields.cargo_name} onChange={e => set("cargo_name", e.target.value)}
              placeholder="Конвейер ленточный, электронника..." className="input-field w-full" />
          </div>

          {/* Weight / Volume */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Вес (кг)</label>
              <input type="number" value={fields.weight_kg} onChange={e => set("weight_kg", e.target.value)}
                placeholder="250" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Объём (cbm)</label>
              <input type="number" step="0.01" value={fields.volume_cbm} onChange={e => set("volume_cbm", e.target.value)}
                placeholder="1.8" className="input-field w-full" />
            </div>
          </div>

          {/* Incoterms / Container */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Инкотермс</label>
              <div className="flex gap-1.5 flex-wrap">
                {INCOTERMS_OPTIONS.map(t => (
                  <button key={t} onClick={() => set("incoterms", fields.incoterms === t ? "" : t)}
                    className={`px-2 py-1 rounded text-xs border transition ${
                      fields.incoterms === t ? "bg-violet-500 text-white border-violet-500" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                    }`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Контейнер</label>
              <div className="flex gap-1.5 flex-wrap">
                {CONTAINER_OPTIONS.map(c => (
                  <button key={c} onClick={() => set("container_type", fields.container_type === c ? "" : c)}
                    className={`px-2 py-1 rounded text-xs border transition ${
                      fields.container_type === c ? "bg-violet-500 text-white border-violet-500" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                    }`}>{c}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Заметка для подрядчиков (необязательно)</label>
            <textarea value={fields.note} onChange={e => set("note", e.target.value)}
              rows={2} placeholder="Негабарит, особые условия..."
              className="input-field w-full resize-none" />
          </div>

          {error && <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition">
            Отмена
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
            <Send className="h-4 w-4" />
            {saving ? "Сохраняем..." : "Сохранить и запустить рассылку"}
          </button>
        </div>
      </div>
    </div>
  );
}
