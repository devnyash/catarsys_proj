interface UserAvatarProps {
  name?: string | null;
  src?: string | null;
  className?: string;
}

// Treat these as "no avatar" so we fall back to the first letter of the name.
function isPlaceholder(src?: string | null): boolean {
  if (!src) return true;
  const trimmed = src.trim();
  if (!trimmed) return true;
  if (trimmed === '/favicon.svg' || trimmed.endsWith('/favicon.svg')) return true;
  return false;
}

function firstLetter(name?: string | null): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '?';
  const cleaned = trimmed.replace(/^@/, '');
  return (cleaned[0] || '?').toUpperCase();
}

export default function UserAvatar({ name, src, className = 'w-10 h-10' }: UserAvatarProps) {
  if (isPlaceholder(src)) {
    return (
      <div
        className={
          'flex items-center justify-center rounded-full bg-foreground/10 text-foreground font-semibold select-none shrink-0 ' +
          className
        }
        aria-hidden="true"
      >
        {firstLetter(name)}
      </div>
    );
  }
  return (
    <img
      src={src as string}
      alt={name || ''}
      className={'rounded-full object-cover bg-foreground/10 shrink-0 ' + className}
    />
  );
}
