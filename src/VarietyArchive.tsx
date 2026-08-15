import { useEffect, useMemo, useState } from "react";

type RawNode = { id: string; name: string; mimeType: string; type: "file" | "folder"; size?: string | null; path: string[] };
export type RawArchive = { generatedAt: string; sourceFolderId: string; nodes: RawNode[] };
type MediaKind = "video" | "image" | "audio" | "subtitle" | "other";
type Media = RawNode & { kind: MediaKind; members: string[] };
type ArchiveEvent = { id: string; title: string; categoryId: string; categoryTitle: string; sourceId: string; sourceType: "file" | "folder"; media: Media[]; dates: string[]; date: string; year: number; episode: number; sortKey: string; programType: string };
type Category = { id: string; title: string; sourceIds: string[]; events: ArchiveEvent[]; featured?: boolean; order: number };

const ROOT_NAME = "VARIETY & PROGRAMS";
const pageSize = 24;
const memberOrder = ["SANGYEON", "JACOB", "YOUNGHOON", "HYUNJAE", "JUYEON", "KEVIN", "Q", "SUNWOO", "ERIC", "HAKNYEON", "NEW"];
const memberPatterns: [string, RegExp][] = [
  ["SANGYEON", /SANGYEON|상연/iu], ["JACOB", /JACOB|제이콥/iu], ["YOUNGHOON", /YOUNGHOON|영훈/iu],
  ["HYUNJAE", /HYUNJAE|현재/iu], ["JUYEON", /JUYEON|주연/iu], ["KEVIN", /KEVIN|케빈/iu],
  ["Q", /(?:^|[^A-Z])Q(?:[^A-Z]|$)|CHANGMIN|창민|큐/iu], ["SUNWOO", /SUNWOO|선우/iu], ["ERIC", /ERIC|에릭/iu],
  ["HAKNYEON", /HAKNYEON|JUHAKNYEON|학년/iu], ["NEW", /(?:^|[^A-Z])NEW(?:[^A-Z]|$)|CHANHEE|찬희|뉴/iu],
];
const categoryRules = [
  { id: "weekly-idol", title: "WEEKLY IDOL", test: (name: string) => /WEEKLY IDOL|주간아이돌/iu.test(name), order: 2 },
  { id: "qn-series", title: "QN ASMR & REVIEW", test: (name: string) => /QN ASMR|QN.*리뷰/iu.test(name), order: 3 },
  { id: "general-meeting", title: "THE BOYZ GENERAL MEETING", test: (name: string) => /GENERAL MEETING|정기총회/iu.test(name), order: 4 },
];

const normalize = (value = "") => value.normalize("NFKD").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const cleanTitle = (value: string) => value.replace(/^\s*\d+\.\s*/u, "").replace(/\.(mp4|webm|mkv|mov|jpg|jpeg|png|mp3|wav|m4a|srt|vtt)$/iu, "").trim();
const slug = (value: string) => normalize(value).replace(/\s+/gu, "-") || "collection";
const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
const fileUrl = (id: string) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
const downloadUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
const thumbnailUrl = (id: string) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`;
const kindOf = (node: RawNode): MediaKind => /\.(srt|vtt|ass)$/iu.test(node.name) ? "subtitle" : node.mimeType.startsWith("video/") ? "video" : node.mimeType.startsWith("image/") ? "image" : node.mimeType.startsWith("audio/") ? "audio" : "other";
const membersOf = (value: string) => memberPatterns.filter(([, pattern]) => pattern.test(value)).map(([member]) => member);
const dateCodes = (value: string) => [...value.matchAll(/(?:^|\D)([12]\d{5})(?=\D|$)/gu)].map((match) => match[1]);
const episodeOf = (value: string) => Number(value.match(/(?:EP(?:ISODE)?[\s._-]*|제\s*)(\d+)(?:회)?/iu)?.[1] || 0);
const isSubtitleFolder = (value: string) => /SUBS?|SUBTITLES?|자막/iu.test(value);
const formatDate = (value: string) => /^\d{6}$/u.test(value) ? `20${value.slice(0, 2)}.${value.slice(2, 4)}.${value.slice(4, 6)}` : "DATE UNKNOWN";
const displayMember = (value: string) => value === "HAKNYEON" ? "HAKNYEON (2017–2025)" : value === "NEW" ? "NEW (2017–2026)" : value;

function classifyProgram(title: string, categoryId: string) {
  if (categoryId === "weekly-idol") return "WEEKLY IDOL";
  if (categoryId === "qn-series") return "QN SERIES";
  if (categoryId === "general-meeting") return "GENERAL MEETING";
  if (/INTERVIEW|GET REAL|CHATROOM|초대석|인터뷰|VOGUE|MAISON|메종/iu.test(title)) return "INTERVIEW";
  if (/TRIP|TIMEOUT|EXPEDITION|JUNGLE|HOTEL|HOUSE|HOME|여행|정글|식구|우리 집|푹 쉬면/iu.test(title)) return "TRAVEL & REALITY";
  if (/ASMR|REVIEW|HUMAN THEATER|웹툰|WEB|YOUTUBE|IDOL LIVE/iu.test(title)) return "WEB PROGRAM";
  if (/MEET & GREET|COMEBACK|ALBUM/iu.test(title)) return "SPECIAL PROGRAM";
  return "VARIETY PROGRAM";
}

function buildArchive(data: RawArchive) {
  const rootFolders = data.nodes.filter((node) => node.type === "folder" && node.path.length === 1);
  const yearFolders = rootFolders.filter((folder) => /^20\d{2}$/u.test(folder.name));
  const assigned = new Set(yearFolders.map((folder) => folder.id));
  const definitions: { id: string; title: string; folders: RawNode[]; order: number; featured?: boolean }[] = [];
  if (yearFolders.length) definitions.push({ id: "programs-by-year", title: "PROGRAMS BY YEAR", folders: yearFolders, order: 1, featured: true });
  for (const rule of categoryRules) {
    const folders = rootFolders.filter((folder) => rule.test(folder.name));
    folders.forEach((folder) => assigned.add(folder.id));
    if (folders.length) definitions.push({ id: rule.id, title: rule.title, folders, order: rule.order });
  }
  rootFolders.filter((folder) => !assigned.has(folder.id)).forEach((folder, index) => definitions.push({ id: `auto-${slug(folder.name)}-${folder.id.slice(0, 5)}`, title: cleanTitle(folder.name), folders: [folder], order: 100 + index }));

  const categories: Category[] = definitions.map((definition) => {
    const events: ArchiveEvent[] = [];
    for (const topFolder of definition.folders) {
      const direct = data.nodes.filter((node) => node.path.length === 2 && node.path[1] === topFolder.name && node.mimeType !== "application/vnd.google-apps.spreadsheet" && !(node.type === "folder" && isSubtitleFolder(node.name)));
      const subtitlePool = data.nodes.filter((node) => node.type === "file" && node.path[1] === topFolder.name && node.path.slice(2).some(isSubtitleFolder));
      for (const source of direct) {
        let mediaNodes = source.type === "file" ? [source] : data.nodes.filter((node) => node.type === "file" && node.path[1] === topFolder.name && node.path[2] === source.name && node.mimeType !== "application/vnd.google-apps.spreadsheet");
        const sourceEpisode = episodeOf(source.name);
        const sourceDates = dateCodes(source.name);
        if (source.type === "file") {
          const matchingSubtitles = subtitlePool.filter((subtitle) => (sourceEpisode && episodeOf(subtitle.name) === sourceEpisode) || (sourceDates.length && dateCodes(subtitle.name).some((date) => sourceDates.includes(date))));
          mediaNodes = [...mediaNodes, ...matchingSubtitles];
        }
        if (!mediaNodes.length && source.type === "folder") continue;
        const media = mediaNodes.map((node) => ({ ...node, kind: kindOf(node), members: membersOf(`${source.name} ${node.name}`) }));
        const dates = [...new Set([...sourceDates, ...media.flatMap((item) => dateCodes(item.name))])].sort();
        const date = dates.at(-1) || "";
        const yearFallback = /^20\d{2}$/u.test(topFolder.name) ? Number(topFolder.name) : 0;
        const episode = sourceEpisode || Math.max(0, ...media.map((item) => episodeOf(item.name)));
        const title = cleanTitle(source.name);
        events.push({
          id: source.id, title, categoryId: definition.id, categoryTitle: definition.title, sourceId: source.id, sourceType: source.type,
          media, dates, date, year: date ? 2000 + Number(date.slice(0, 2)) : yearFallback, episode,
          sortKey: date || (episode ? `000000-${String(episode).padStart(5, "0")}` : `000000-${normalize(title)}`),
          programType: classifyProgram(title, definition.id),
        });
      }
    }
    return { id: definition.id, title: definition.title, sourceIds: definition.folders.map((folder) => folder.id), events: events.sort((a, b) => b.sortKey.localeCompare(a.sortKey)), featured: definition.featured, order: definition.order };
  }).sort((a, b) => a.order - b.order);
  return { categories, events: categories.flatMap((category) => category.events) };
}

function representative(event: ArchiveEvent) {
  return event.media.find((item) => item.kind === "video") || event.media.find((item) => item.kind === "image") || null;
}

function MediaTile({ media }: { media: Media }) {
  const visual = media.kind === "video" || media.kind === "image";
  return <figure className={`media-tile ${media.kind}-tile`}>
    <a className="media-visual" href={fileUrl(media.id)} target="_blank" rel="noreferrer">
      {visual ? <img src={thumbnailUrl(media.id)} alt="" loading="lazy" /> : <span className="no-cover">{media.kind.toUpperCase()}</span>}
      {media.kind === "video" && <span className="play-mark">WATCH ON GOOGLE DRIVE ↗</span>}
    </a>
    <div className="image-actions"><span className="file-name" title={media.name}>{media.name}</span><span className="file-action-links"><a href={fileUrl(media.id)} target="_blank" rel="noreferrer">VIEW ↗</a><a href={downloadUrl(media.id)} target="_blank" rel="noreferrer">DOWNLOAD ↓</a></span></div>
  </figure>;
}

function EventCard({ event, open }: { event: ArchiveEvent; open: () => void }) {
  const cover = representative(event);
  const firstVideo = event.media.find((item) => item.kind === "video");
  const shownDate = event.dates.length > 1 ? `${formatDate(event.dates[0])}–${formatDate(event.dates.at(-1)!)}` : event.date ? formatDate(event.date) : event.episode ? `EPISODE ${event.episode}` : "DATE UNKNOWN";
  return <article className="card">
    <button className="thumb" onClick={open} aria-label={`Open ${event.title}`}>
      {cover ? <img src={thumbnailUrl(cover.id)} alt="" loading="lazy" /> : <span className="no-cover">NO PREVIEW</span>}
      <span className="number">{event.programType}</span><span className="photo-count">{event.media.length} FILES</span>
    </button>
    <div className="card-info"><span className="eyebrow">{shownDate} · {event.categoryTitle}</span><h2>{event.title}</h2>
      <div className="meta"><span>YEAR</span><strong>{event.year || "—"}</strong>{event.episode > 0 && <><span>EPISODE</span><strong>{event.episode}</strong></>}<span>MEDIA</span><strong>{event.media.length} FILES</strong></div>
      <div className="card-actions">{firstVideo && <a href={fileUrl(firstVideo.id)} target="_blank" rel="noreferrer">WATCH ↗</a>}<button onClick={open}>OPEN PROGRAM →</button></div>
    </div>
  </article>;
}

function parseHash() {
  const [kind, categoryId, eventId] = location.hash.replace(/^#\/?/u, "").split("/");
  return kind === "program" ? { categoryId, eventId } : kind === "category" ? { categoryId, eventId: "" } : { categoryId: "", eventId: "" };
}

export function VarietyArchive({ data }: { data: RawArchive }) {
  const archive = useMemo(() => buildArchive(data), [data]);
  const [route, setRoute] = useState(parseHash);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("desc");
  const [memberFilter, setMemberFilter] = useState("all");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [shown, setShown] = useState(pageSize);
  useEffect(() => { const change = () => { setRoute(parseHash()); setShown(pageSize); window.scrollTo({ top: 0, behavior: "smooth" }); }; window.addEventListener("hashchange", change); return () => window.removeEventListener("hashchange", change); }, []);

  const selectedCategory = archive.categories.find((category) => category.id === route.categoryId);
  const selectedEvent = selectedCategory?.events.find((event) => event.id === route.eventId);
  const years = [...new Set(archive.events.map((event) => event.year).filter(Boolean))].sort((a, b) => b - a);
  const programTypes = [...new Set(archive.events.map((event) => event.programType))].sort();
  const tokens = normalize(query).split(" ").filter(Boolean);
  const baseEvents = selectedCategory ? selectedCategory.events : archive.events;
  const filtered = baseEvents.filter((event) => {
    if (categoryFilter !== "all" && event.categoryId !== categoryFilter) return false;
    if (yearFilter !== "all" && String(event.year) !== yearFilter) return false;
    if (typeFilter !== "all" && event.programType !== typeFilter) return false;
    const haystack = normalize([event.title, event.categoryTitle, event.date, event.dates.join(" "), event.episode, event.programType, ...event.media.flatMap((item) => [item.name, ...item.members])].join(" "));
    return tokens.every((token) => haystack.includes(token));
  }).sort((a, b) => sort === "asc" ? a.sortKey.localeCompare(b.sortKey) : b.sortKey.localeCompare(a.sortKey));

  const totalMedia = archive.events.reduce((sum, event) => sum + event.media.length, 0);
  const updated = new Date(data.generatedAt).toLocaleDateString("en-GB");
  const goHome = () => { location.hash = "home"; setQuery(""); setCategoryFilter("all"); };
  const goCategory = (id: string) => { location.hash = `category/${id}`; setCategoryFilter("all"); setYearFilter("all"); setTypeFilter("all"); };
  const goEvent = (event: ArchiveEvent) => { location.hash = `program/${event.categoryId}/${event.id}`; };

  if (selectedEvent) {
    const availableMembers = memberOrder.filter((member) => selectedEvent.media.some((item) => item.members.includes(member)));
    const media = selectedEvent.media.filter((item) => (memberFilter === "all" || item.members.includes(memberFilter)) && (mediaFilter === "all" || item.kind === mediaFilter));
    return <main id="top"><Header categories={archive.categories.length} programs={archive.events.length} media={totalMedia} updated={updated} />
      <section className="event-page">
        <header className="member-gallery-head"><button onClick={() => goCategory(selectedEvent.categoryId)}>← ALL PROGRAMS</button><div><span>{selectedEvent.categoryTitle} / PROGRAM</span><h2>{selectedEvent.title}</h2></div><a href={selectedEvent.sourceType === "folder" ? folderUrl(selectedEvent.sourceId) : fileUrl(selectedEvent.sourceId)} target="_blank" rel="noreferrer">OPEN SOURCE ↗</a></header>
        <div className="member-filters"><label>MEDIA TYPE<select value={mediaFilter} onChange={(event) => setMediaFilter(event.target.value)}><option value="all">ALL MEDIA</option><option value="video">VIDEO</option><option value="image">PHOTOS</option><option value="audio">AUDIO</option><option value="subtitle">SUBTITLES</option><option value="other">OTHER FILES</option></select></label>{availableMembers.length ? <label>MEMBER<select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}><option value="all">ALL MEMBERS</option>{availableMembers.map((member) => <option key={member} value={member}>{displayMember(member)}</option>)}</select></label> : <div className="blank-filter" />}<p>{media.length} RESULTS</p></div>
        <div className="member-period"><p>PROGRAM MEDIA</p><span>GOOGLE DRIVE SOURCE</span></div>
        {media.length ? <div className="media-grid">{media.map((item) => <MediaTile key={item.id} media={item} />)}</div> : <div className="empty"><strong>NO MEDIA</strong>NO FILES MATCH THESE FILTERS.</div>}
      </section><Footer sourceId={data.sourceFolderId} /></main>;
  }

  const showResults = Boolean(query || selectedCategory || categoryFilter !== "all" || yearFilter !== "all" || typeFilter !== "all");
  return <main id="top"><Header categories={archive.categories.length} programs={archive.events.length} media={totalMedia} updated={updated} />
    <section className="controls">
      <div className="search"><span>⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setShown(pageSize); }} placeholder="SEARCH PROGRAM, FILE OR YYMMDD DATE…" aria-label="Search archive" />{query && <button className="clear" onClick={() => setQuery("")}>CLEAR</button>}</div>
      <div className="filter-row"><label>COLLECTION<select value={selectedCategory?.id || categoryFilter} onChange={(event) => event.target.value === "all" ? goHome() : goCategory(event.target.value)}><option value="all">ALL COLLECTIONS</option>{archive.categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label><label>YEAR<select value={yearFilter} onChange={(event) => { setYearFilter(event.target.value); setShown(pageSize); }}><option value="all">ALL YEARS</option>{years.map((year) => <option key={year}>{year}</option>)}</select></label><label>PROGRAM TYPE<select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setShown(pageSize); }}><option value="all">ALL TYPES</option>{programTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label>SORT<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="desc">NEWEST FIRST</option><option value="asc">OLDEST FIRST</option></select></label></div>
    </section>
    {!showResults ? <section className="category-picker"><div className="picker-head"><p>SELECT A COLLECTION · {archive.categories.length} SECTIONS</p><a href={folderUrl(data.sourceFolderId)} target="_blank" rel="noreferrer">OPEN SOURCE FOLDER ↗</a></div><div className={`category-grid count-${archive.categories.length}`}>{archive.categories.map((category, index) => <button className={category.featured ? "featured" : ""} key={category.id} onClick={() => goCategory(category.id)}><span>{String(index + 1).padStart(2, "0")} / COLLECTION</span><strong>{category.title}</strong><small>{category.events.length} PROGRAMS · {category.events.reduce((sum, event) => sum + event.media.length, 0)} FILES →</small></button>)}</div></section> : <section className="archive-section"><div className="results-head"><p>{selectedCategory?.title || "SEARCH RESULTS"} · {filtered.length} PROGRAMS</p><button onClick={goHome}>ALL COLLECTIONS ↑</button></div>{filtered.length ? <div className="cards">{filtered.slice(0, shown).map((event) => <EventCard key={event.id} event={event} open={() => goEvent(event)} />)}</div> : <div className="empty"><strong>NO RESULTS</strong>TRY A PROGRAM NAME OR YYMMDD DATE.</div>}{shown < filtered.length && <button className="load-more" onClick={() => setShown((value) => value + pageSize)}>LOAD MORE PROGRAMS ↓</button>}</section>}
    <Footer sourceId={data.sourceFolderId} /></main>;
}

function Header({ categories, programs, media, updated }: { categories: number; programs: number; media: number; updated: string }) {
  return <header className="masthead"><div className="utility"><a className="brand" href="https://tbzarchive1206.github.io/tbzarchive/">THE BOYZ / FAN ARCHIVE</a><nav><span>VARIETY & PROGRAMS</span><span>/</span><a href="https://x.com/tbzarchive1206_" target="_blank" rel="noreferrer">TWITTER ↗</a></nav></div><a href="#home"><h1><span className="solid">VARIETY &</span><span className="outline">PROGRAMS</span></h1></a><div className="stats"><p><strong>{categories}</strong> COLLECTIONS</p><i /><p><strong>{programs}</strong> PROGRAMS</p><i /><p><strong>{media.toLocaleString("en-US")}</strong> MEDIA FILES</p><i /><p>UPDATED <strong>{updated}</strong></p></div></header>;
}

function Footer({ sourceId }: { sourceId: string }) { return <footer><span>© THE BOYZ FAN ARCHIVE</span><a href={folderUrl(sourceId)} target="_blank" rel="noreferrer">SOURCE FOLDER ↗</a><a href="#top">BACK TO TOP ↑</a></footer>; }
