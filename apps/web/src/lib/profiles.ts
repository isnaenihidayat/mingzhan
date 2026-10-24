import type { ProfileSummary } from "@mingzhan/core/contract";

export function findSuperMingzhanProfile(
  profiles: ProfileSummary[]
): ProfileSummary | undefined {
  return profiles.find((profile) => profile.isSuper);
}

/** Profile id to open for Super MíngZhàn chat CTAs, or null when none exists. */
export function resolveSuperMingzhanChatProfileId(
  profiles: Array<Pick<ProfileSummary, "id" | "isSuper">>
): string | null {
  return profiles.find((profile) => profile.isSuper)?.id ?? null;
}

/** True for the member who created the agent. Admin-created agents have no owner. */
export function isProfileOwner(
  profile: Pick<ProfileSummary, "ownerUserId"> | null | undefined,
  userId: string | undefined
): boolean {
  return Boolean(userId) && profile?.ownerUserId === userId;
}

export function findDefaultProfile(
  profiles: ProfileSummary[]
): ProfileSummary | undefined {
  return profiles.find((profile) => profile.isDefault) ?? profiles[0];
}

export function resolveInitialProfileId(
  profiles: Array<Pick<ProfileSummary, "id" | "isDefault">>
): string {
  return (
    profiles.find((profile) => profile.isDefault)?.id ?? profiles[0]?.id ?? ""
  );
}
