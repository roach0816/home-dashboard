// Iconify's simple-icons collection only has brand marks for a handful of
// US ISPs — verified by checking each slug actually resolves (many
// plausible-looking ones, like "comcast" or "att", 404). Anything not in
// this list falls back to a generic icon rather than a broken/guessed slug.
const ISP_ICON_MAP: Array<[match: string, icon: string]> = [
  ["verizon", "simple-icons:verizon"],
  ["t-mobile", "simple-icons:tmobile"],
  ["tmobile", "simple-icons:tmobile"],
  ["spectrum", "simple-icons:spectrum"],
];

const GENERIC_WAN_ICON = "mdi:web";

export function ispIcon(ispName: string | undefined): string {
  const name = ispName?.toLowerCase().trim();
  if (name) {
    const match = ISP_ICON_MAP.find(([key]) => name.includes(key));
    if (match) return match[1];
  }
  return GENERIC_WAN_ICON;
}
