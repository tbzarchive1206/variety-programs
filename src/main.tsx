import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import archiveData from "../app/data/archive.generated.json";
import { VarietyArchive, type RawArchive } from "./VarietyArchive";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><VarietyArchive data={archiveData as RawArchive} /></StrictMode>,
);
