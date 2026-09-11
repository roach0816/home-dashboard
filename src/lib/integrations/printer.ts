import "server-only";
import snmp from "net-snmp";
import type { PrinterConfig } from "@/lib/types";

export type PrinterSupply = {
  description: string;
  /** 0-100, or null when the printer reports a supply is present but doesn't give a quantifiable level. */
  percent: number | null;
};

export type PrinterData = {
  supplies: PrinterSupply[];
};

// Standard "Printer MIB" (RFC 3805) marker supplies table. This is vendor-
// neutral — any printer that answers SNMP with this MIB works here, not
// just specific brands. The client OID is the table (one level above the
// conceptual "entry" the actual values live under); net-snmp adds that
// entry level itself.
const SUPPLIES_TABLE_OID = "1.3.6.1.2.1.43.11.1";
const COL_DESCRIPTION = 6;
const COL_MAX_CAPACITY = 8;
const COL_LEVEL = 9;

type SupplyRow = Record<number, unknown>;

export async function fetchPrinterData(
  config: PrinterConfig,
  secrets: Record<string, string>,
): Promise<PrinterData> {
  const community = secrets.community || "public";
  const session = snmp.createSession(config.host, community, {
    port: config.port || 161,
    version: snmp.Version2c,
    timeout: 5000,
    retries: 1,
  });

  try {
    const table = await new Promise<Record<string, SupplyRow>>((resolve, reject) => {
      session.tableColumns(
        SUPPLIES_TABLE_OID,
        [String(COL_DESCRIPTION), String(COL_MAX_CAPACITY), String(COL_LEVEL)],
        20,
        (error, result) => {
          if (error) reject(error);
          else resolve((result ?? {}) as Record<string, SupplyRow>);
        },
      );
    });

    const supplies: PrinterSupply[] = [];
    for (const row of Object.values(table)) {
      const descriptionRaw = row[COL_DESCRIPTION];
      if (descriptionRaw == null) continue;

      const maxCapacity = Number(row[COL_MAX_CAPACITY]);
      const level = Number(row[COL_LEVEL]);

      // RFC 3805 special values: -1 = unknown, -2 = present but not quantifiable.
      const percent =
        Number.isFinite(maxCapacity) && maxCapacity > 0 && Number.isFinite(level) && level >= 0
          ? Math.round((level / maxCapacity) * 100)
          : null;

      supplies.push({ description: String(descriptionRaw), percent });
    }

    return { supplies };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "RequestTimedOutError") {
        throw new Error("Timed out reaching the printer — check the host and that SNMP is enabled on it.");
      }
      throw new Error(`SNMP error: ${err.message}`);
    }
    throw new Error("Failed to query the printer over SNMP.");
  } finally {
    session.close();
  }
}
