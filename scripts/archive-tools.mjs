export const ROOT_FOLDER_ID = "1O5vlhVVIfJRsjBLMmgTHiNW7fz_uprrw";
export const ROOT_TITLE = "VARIETY & PROGRAMS";

export function topLevelFolders(raw) {
  return raw.nodes.filter((node) => node.type === "folder" && node.path.length === 1);
}

export function summarizeRaw(raw) {
  const top = topLevelFolders(raw);
  return {
    nodes: raw.nodes.length,
    folders: raw.nodes.filter((node) => node.type === "folder").length,
    files: raw.nodes.filter((node) => node.type === "file").length,
    topFolders: top.length,
    yearFolders: top.filter((node) => /^20\d{2}$/u.test(node.name)).length,
    subtitles: raw.nodes.filter((node) => /\.(srt|vtt|ass)$/iu.test(node.name)).length,
  };
}
