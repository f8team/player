import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export interface ControlMenuOption {
  value: string;
  label: string;
  badge?: string | null;
  active: boolean;
  onSelect: () => void;
}

export interface ControlMenuProps {
  className?: string;
  control: "captions" | "quality" | "settings" | "playback-rate";
  menuId: string;
  ariaLabel: string;
  trigger: ReactNode;
  options: ControlMenuOption[];
  active?: boolean;
  title?: string;
  rootAttributes?: Record<`data-${string}`, string | number | undefined>;
}

let nextControlMenuId = 0;

function useStableMenuId(prefix: string): string {
  const idRef = useRef<string>();
  if (!idRef.current) {
    nextControlMenuId += 1;
    idRef.current = `${prefix}-${nextControlMenuId}`;
  }
  return idRef.current;
}

export function ControlMenu({
  className,
  control,
  menuId,
  ariaLabel,
  trigger,
  options,
  active,
  title,
  rootAttributes,
}: ControlMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useStableMenuId(`f8p-${menuId}-menu`);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeydown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const popover = rootRef.current?.querySelector<HTMLElement>(
      `[data-reel-control-popover="${menuId}"]`,
    );
    const selected = popover?.querySelector<HTMLElement>(
      '[data-reel-control-option][aria-selected="true"]',
    );
    const first = popover?.querySelector<HTMLElement>("[data-reel-control-option]");
    (selected ?? first)?.focus();
  }, [menuId, open]);

  const handleTriggerKeydown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    setOpen(true);
  };

  const handleListboxKeydown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const popover = event.currentTarget;
    const items = Array.from(popover.querySelectorAll<HTMLElement>("[data-reel-control-option]"));
    const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLElement));

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    const nextIndex =
      event.key === "ArrowDown"
        ? Math.min(items.length - 1, currentIndex + 1)
        : event.key === "ArrowUp"
          ? Math.max(0, currentIndex - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : -1;

    if (nextIndex < 0) return;
    event.preventDefault();
    items[nextIndex]?.focus();
  };

  return (
    <span
      ref={rootRef}
      className={className}
      title={title}
      data-reel-control={control}
      data-reel-control-menu={menuId}
      data-reel-menu-open={open ? "" : undefined}
      data-reel-captions-active={control === "captions" && active ? "" : undefined}
      {...rootAttributes}
    >
      <button
        ref={triggerRef}
        type="button"
        className="f8p-menu-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        data-reel-control-trigger={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleTriggerKeydown}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={panelId}
          className="f8p-menu-popover"
          role="listbox"
          aria-label={ariaLabel}
          data-reel-control-popover={menuId}
          onKeyDown={handleListboxKeydown}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="f8p-menu-option"
              role="option"
              aria-selected={option.active}
              data-reel-control-option=""
              data-active={option.active ? "" : undefined}
              data-value={option.value}
              onClick={() => {
                option.onSelect();
                setOpen(false);
              }}
            >
              <span data-reel-option-label="">{option.label}</span>
              {option.badge ? <span data-reel-option-badge="">{option.badge}</span> : null}
              {option.active ? (
                <span data-reel-option-check="" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
