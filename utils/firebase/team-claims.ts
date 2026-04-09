import { auth } from "./client";

export const setTeamIdClaim = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const token = await user.getIdToken();

  await fetch("/app/api/setTeamClaim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  await user.getIdToken(true);
};
