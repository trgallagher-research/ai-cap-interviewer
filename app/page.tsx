import { redirect } from "next/navigation";

// Root sends you into the studio (which bounces to /login if you're not signed in).
export default function Home() {
  redirect("/studio");
}
