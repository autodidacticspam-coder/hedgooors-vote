import { redirect } from "next/navigation";

export default async function ResultsPage() {
  // Redirect to the polls page (results are now per-poll)
  redirect("/polls");
}
