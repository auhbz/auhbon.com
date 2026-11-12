import { permanentRedirect } from "next/navigation";

/** Hands-on tasks now live on the Review page (MP5). */
export default function HandsOnTasks() {
  permanentRedirect("/dev/review");
}
