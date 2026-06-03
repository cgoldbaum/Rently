import { memo } from 'react';

type IconName =
  | 'home' | 'chart' | 'dollar' | 'clipboard' | 'wrench' | 'camera'
  | 'users' | 'bell' | 'trending' | 'check' | 'x' | 'clock'
  | 'plus' | 'search' | 'chevron' | 'alert' | 'building' | 'star'
  | 'file' | 'logout' | 'menu' | 'photo' | 'filter' | 'settings'
  | 'link' | 'copy' | 'edit' | 'trash' | 'message'
  | 'folder' | 'tag';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

const Icon = memo(function Icon({ name, size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <use href={`/icons/${name}.svg#root`} />
    </svg>
  );
});

export default Icon;
