// Iconify's simple-icons collection only has brand marks for a handful of
// US ISPs — verified by checking each slug actually resolves (many
// plausible-looking ones, like "comcast" or "att", 404). Anything not in
// this list falls back to a generic icon rather than a broken/guessed slug.
// Hex values are each brand's official color, from simple-icons' own data
// (https://github.com/simple-icons/simple-icons/blob/develop/data/simple-icons.json)
// — iconify serves brand marks as flat `currentColor` by default, so
// without forcing the color explicitly every logo would render black.
const ISP_ICON_MAP: Array<[match: string, icon: string, hex: string]> = [
  ["verizon", "simple-icons:verizon", "CD040B"],
  ["t-mobile", "simple-icons:tmobile", "E20074"],
  ["tmobile", "simple-icons:tmobile", "E20074"],
  ["spectrum", "simple-icons:spectrum", "7B16FF"],
];

const GENERIC_WAN_ICON = "mdi:web";

export function ispIcon(ispName: string | undefined): string {
  const name = ispName?.toLowerCase().trim();
  if (name) {
    const match = ISP_ICON_MAP.find(([key]) => name.includes(key));
    if (match) {
      const [, icon, hex] = match;
      const [prefix, ...rest] = icon.split(":");
      return `https://api.iconify.design/${prefix}/${rest.join(":")}.svg?color=%23${hex}`;
    }
  }
  return GENERIC_WAN_ICON;
}
