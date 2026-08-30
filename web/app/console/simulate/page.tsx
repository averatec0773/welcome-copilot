// Simulate is now a modal on the Tracker page — this route stays live (old
// links, bookmarks) but just forwards visitors there.
import { redirect } from "next/navigation";

export default function SimulateRedirect() {
  redirect("/console/tracker");
}
