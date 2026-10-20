import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { seed } from "../core/seed";
import {
  parseDataset,
  parseOrder,
  record,
  ValidationError,
} from "../core/validation";
// One queue per store instance. The API retains one instance for the local process.
export function createStore(directory: string) {
  const file = path.join(directory, "state.json");
  let queue: Promise<unknown> = Promise.resolve();
  async function read() {
    try {
      return parseDataset(JSON.parse(await readFile(file, "utf8")));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return seed();
      throw e;
    }
  }
  function mutate(body: unknown) {
    const job = queue.then(async () => {
      if (!record(body))
        throw new ValidationError("Permintaan harus berupa objek.");
      // Explicit data reset can recover a corrupt file; adding never overwrites it.
      let data = body.action === "reset" ? seed() : await read();
      if (body.action === "add") {
        const order = parseOrder(body.order, data);
        if (data.orders.some((o) => o.id === order.id))
          throw new ValidationError("ID pesanan sudah digunakan.");
        data = { ...data, orders: [...data.orders, order] };
      } else if (body.action !== "reset")
        throw new ValidationError("Aksi tidak dikenal.");
      await mkdir(directory, { recursive: true });
      const temporary = path.join(directory, `${crypto.randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify(data, null, 2), "utf8");
        await rename(temporary, file);
      } finally {
        await unlink(temporary).catch(() => {});
      }
      return data;
    });
    queue = job.catch(() => {});
    return job;
  }
  return { read, mutate };
}
