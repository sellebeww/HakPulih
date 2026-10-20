"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { seed, scenario } from "@/core/seed";
import { CONFIG } from "@/core/config";
import {
  createSimulation,
  restoreSession,
  serializeSession,
  transition,
  type Simulation,
  type DecisionEvent,
} from "@/core/session";
import { parseDataset } from "@/core/validation";
import type { Dataset } from "@/core/types";
const KEY = "hakpulih:session:v1";
export function useNetwork() {
  const [base, setBase] = useState<Dataset>(seed);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const saving = useRef(false);
  const storageWarning = useRef(false);
  const load = useCallback(async () => {
    setLoadError("");
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      const payload = await r.json();
      if (!r.ok) throw Error(payload.error || "Gagal memuat data.");
      const d = parseDataset(payload);
      setBase(d);
      try {
        const raw = sessionStorage.getItem(KEY);
        if (raw) {
          const restored = restoreSession(raw, d);
          setSimulation(restored);
          if (!restored) {
            sessionStorage.removeItem(KEY);
            setMessage(
              "Sesi lama tidak cocok dengan data terbaru. Simulasi dimulai ulang.",
            );
          } else setMessage("Sesi peninjauan berhasil dipulihkan.");
        }
      } catch {
        storageWarning.current = true;
        setMessage(
          "Penyimpanan sesi browser tidak tersedia. Simulasi tetap dapat digunakan, tetapi tidak bertahan setelah muat ulang.",
        );
      }
      setLoaded(true);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!loaded) return;
    try {
      if (simulation)
        sessionStorage.setItem(KEY, serializeSession(simulation, base));
      else sessionStorage.removeItem(KEY);
    } catch {
      if (!storageWarning.current) {
        storageWarning.current = true;
        setMessage(
          "Sesi tidak dapat disimpan di browser. Hindari memuat ulang sebelum peninjauan selesai.",
        );
      }
    }
  }, [simulation, base, loaded]);
  function dispatch(event: DecisionEvent) {
    setSimulation((s) => (s ? transition(s, event) : s));
  }
  function start(
    data: Dataset,
    quality = CONFIG.qualityPenalty,
    selected = "manual",
  ) {
    if (!loaded || saving.current) return;
    setSimulation(
      createSimulation(
        data,
        selected,
        { ...CONFIG, qualityPenalty: quality },
        Date.now(),
      ),
    );
    setMessage("Gangguan dijalankan. Rencana siap ditinjau semua pihak.");
  }
  function runScenario(id: string) {
    start(scenario(id, base), id === "S4" ? 1000 : CONFIG.qualityPenalty, id);
  }
  function resetSimulation() {
    setSimulation(null);
    setMessage("Simulasi direset. Pesanan manual tetap tersimpan.");
  }
  async function save(body: unknown) {
    if (saving.current || !loaded) return false;
    saving.current = true;
    setBusy(true);
    try {
      const r = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setBase(parseDataset(d));
      setSimulation(null);
      setMessage("Data tersimpan. Jalankan skenario untuk menghitung ulang.");
      return true;
    } catch (e) {
      setMessage((e as Error).message);
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return {
    base,
    simulation,
    loaded,
    busy,
    message,
    setMessage,
    loadError,
    retry: load,
    start,
    runScenario,
    resetSimulation,
    save,
    dispatch,
  };
}
