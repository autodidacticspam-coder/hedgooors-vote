import { redirect } from "next/navigation";

export default async function VotePage() {
  // Redirect to the new polls page
  redirect("/polls");
}
