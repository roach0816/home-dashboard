import "server-only";
import snmp from "net-snmp";
import type { Varbind } from "net-snmp";
import type { PrinterConfig } from "@/lib/types";

export type PrinterSupply = {
  description: string;
  /** 0-100, or null when the printer doesn't report a quantifiable level. */
  percent: number | null;
  /**
   * Fallback status text (e.g. "OK", "Toner Low: BK") used only when
   * `percent` is null — some printers (notably several Brother models)
   * never compute a toner percentage at all, but do reliably flag it via
   * the standard Alert Table once it's actually low.
   */
  status?: string;
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

// Standard Printer MIB Alert Table. Printers that don't (or can't) report
// a numeric supply level often still populate this table reliably once a
// supply is actually low — it's typically empty when everything's fine.
const ALERT_DESCRIPTION_OID = "1.3.6.1.2.1.43.18.1.1.8";

const SUPPLY_KEYWORDS = ["toner", "ink", "drum", "belt", "fuser", "waste", "developer", "staple", "transfer"];

type SupplyRow = Record<number, unknown>;

function queryTable(host: string, port: number, community: string, version: 0 | 1) {
  const session = snmp.createSession(host, community, { port, version, timeout: 5000, retries: 1 });
  return new Promise<Record<string, SupplyRow>>((resolve, reject) => {
    session.tableColumns(
      SUPPLIES_TABLE_OID,
      [String(COL_DESCRIPTION), String(COL_MAX_CAPACITY), String(COL_LEVEL)],
      20,
      (error, result) => {
        session.close();
        if (error) reject(error);
        else resolve((result ?? {}) as Record<string, SupplyRow>);
      },
    );
  });
}

/** Active alert description strings (empty when the printer reports nothing wrong). */
function queryAlertDescriptions(host: string, port: number, community: string, version: 0 | 1) {
  const session = snmp.createSession(host, community, { port, version, timeout: 5000, retries: 1 });
  const descriptions: string[] = [];
  return new Promise<string[]>((resolve) => {
    session.subtree(
      ALERT_DESCRIPTION_OID,
      20,
      (varbinds: Varbind[]) => {
        for (const vb of varbinds) {
          if (vb.value != null) descriptions.push(String(vb.value));
        }
      },
      () => {
        session.close();
        resolve(descriptions);
      },
    );
  });
}

function matchAlert(supplyDescription: string, alerts: string[]): string | undefined {
  const lowerDesc = supplyDescription.toLowerCase();
  const keyword = SUPPLY_KEYWORDS.find((k) => lowerDesc.includes(k));
  if (!keyword) return undefined;
  return alerts.find((a) => a.toLowerCase().includes(keyword));
}

export async function fetchPrinterData(
  config: PrinterConfig,
  secrets: Record<string, string>,
): Promise<PrinterData> {
  const community = secrets.community || "public";
  const port = config.port || 161;

  try {
    // Most printers speak SNMPv2c, which is more efficient (GETBULK), but
    // plenty of office/label printers (e.g. older Canon imageCLASS units)
    // only implement v1 and silently drop v2c requests rather than
    // erroring, which looks identical to a network timeout. Try v2c first
    // and fall back to v1 so both kinds of printers work without the user
    // needing to know which protocol version their hardware supports.
    let table: Record<string, SupplyRow>;
    let version: 0 | 1 = snmp.Version2c;
    try {
      table = await queryTable(config.host, port, community, version);
    } catch (err) {
      if (err instanceof Error && err.name === "RequestTimedOutError") {
        version = snmp.Version1;
        table = await queryTable(config.host, port, community, version);
      } else {
        throw err;
      }
    }

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

    if (supplies.some((s) => s.percent == null)) {
      const alerts = await queryAlertDescriptions(config.host, port, community, version);
      for (const supply of supplies) {
        if (supply.percent == null) {
          supply.status = matchAlert(supply.description, alerts) ?? "OK";
        }
      }
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
  }
}
