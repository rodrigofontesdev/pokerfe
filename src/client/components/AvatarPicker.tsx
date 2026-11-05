import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { AVATARS, isAvatarId, type AvatarId } from "@shared/avatars.ts";
import { Avatar } from "./Avatar.tsx";

const NONE = "";

type AvatarPickerProps = {
  value: AvatarId | null;
  onChange: (value: AvatarId | null) => void;
  displayName: string;
};

const optionClass =
  "flex size-14 cursor-pointer items-center justify-center rounded-full border-2 border-transparent outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 data-[checked]:border-blue-600 data-[checked]:bg-blue-50";

export function AvatarPicker({
  value,
  onChange,
  displayName,
}: AvatarPickerProps) {
  return (
    <RadioGroup
      aria-label="Avatar"
      value={value ?? NONE}
      onValueChange={(next) => onChange(isAvatarId(next) ? next : null)}
      className="flex flex-wrap gap-2"
    >
      <Radio.Root value={NONE} aria-label="Sem avatar" className={optionClass}>
        <Avatar avatarId={null} displayName={displayName} />
      </Radio.Root>
      {AVATARS.map(({ id, name }) => (
        <Radio.Root
          key={id}
          value={id}
          aria-label={name}
          className={optionClass}
        >
          <Avatar avatarId={id} displayName={displayName} />
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
