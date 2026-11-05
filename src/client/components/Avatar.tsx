import { avatarName, isAvatarId, nameInitial } from "@shared/avatars.ts";

const images = import.meta.glob<string>("../assets/avatars/*.png", {
  eager: true,
  import: "default",
});

function avatarSrc(id: string): string | undefined {
  return images[`../assets/avatars/${id}.png`];
}

type AvatarProps = {
  avatarId: string | null;
  displayName: string;
  className?: string;
};

export function Avatar({
  avatarId,
  displayName,
  className = "size-10",
}: AvatarProps) {
  const src = isAvatarId(avatarId) ? avatarSrc(avatarId) : undefined;

  if (isAvatarId(avatarId) && src) {
    return (
      <img
        src={src}
        alt={avatarName(avatarId)}
        width={128}
        height={128}
        className={`${className} shrink-0 rounded-full object-contain`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700 select-none`}
    >
      {nameInitial(displayName)}
    </span>
  );
}
