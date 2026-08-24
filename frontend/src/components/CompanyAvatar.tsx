const AVATAR_PALETTES = [
  { bg: "#EEF2FF", text: "#4338CA" },
  { bg: "#ECFDF5", text: "#047857" },
  { bg: "#FFF7ED", text: "#9A3412" },
  { bg: "#EFF6FF", text: "#1D4ED8" },
  { bg: "#F5F3FF", text: "#6D28D9" },
  { bg: "#F0FDFA", text: "#0F766E" },
]

function paletteForName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length
  return AVATAR_PALETTES[index]
}

export function CompanyAvatar({
  name,
  size = 40,
}: {
  name: string | null
  size?: number
}) {
  const displayName = name || "?"
  const letter = displayName.trim().charAt(0).toUpperCase() || "?"
  const palette = paletteForName(displayName)

  return (
    <div
      className="rounded-full flex items-center justify-center font-medium shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: palette.bg,
        color: palette.text,
        fontSize: size * 0.4,
      }}
    >
      {letter}
    </div>
  )
}