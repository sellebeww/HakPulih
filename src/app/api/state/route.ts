import { NextResponse } from "next/server";
import path from "node:path";
import { createStore } from "@/server/store";
import { ValidationError } from "@/core/validation";
import { isSameOrigin } from "@/server/origin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const store = createStore(
  process.env.HAKPULIH_DATA_DIR ?? path.join(process.cwd(), "data"),
);
export async function GET() {
  try {
    return NextResponse.json(await store.read(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Data lokal tidak dapat dibaca. Periksa data/state.json; data tidak ditimpa otomatis.",
      },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Asal permintaan tidak diizinkan." },
      { status: 403 },
    );
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return NextResponse.json(
      { error: "Gunakan format application/json." },
      { status: 415 },
    );
  try {
    // Read bounded chunks instead of trusting the client-provided Content-Length.
    const reader = request.body?.getReader();
    if (!reader) throw new ValidationError("Permintaan kosong.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16_384) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Permintaan terlalu besar." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new ValidationError("JSON tidak valid.");
    }
    return NextResponse.json(await store.mutate(body));
  } catch (e) {
    if (e instanceof ValidationError)
      return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json(
      {
        error:
          "Penyimpanan gagal. Periksa ruang disk dan izin berkas, lalu coba lagi.",
      },
      { status: 500 },
    );
  }
}
