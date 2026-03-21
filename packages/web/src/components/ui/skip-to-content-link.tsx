'use client';

interface SkipToContentLinkProps {
  targetId?: string;
}

export default function SkipToContentLink({ targetId = 'main-content' }: SkipToContentLinkProps) {
  return (
    <a
      className="skip-link"
      href={`#${targetId}`}
      onClick={() => {
        const target = document.getElementById(targetId);
        if (!target) {
          return;
        }

        window.requestAnimationFrame(() => {
          target.focus();
        });
      }}
    >
      Skip to content
    </a>
  );
}
