import {useEffect, useRef} from "react";

// The modal is a native <dialog> opened with showModal(). The browser then owns
// the focus trap, Escape-to-close, scroll lock, and the top-layer backdrop that
// a role="dialog" <div> otherwise has to hand-wire — and usually gets subtly
// wrong (Tab walking out to the page behind, focus never returning to the opener).
//
// Render it only while it should be open: mounting calls showModal(), unmounting
// calls close(), which restores focus to whatever opened it.
export const Modal = ({
  className = "",
  role,
  label,
  labelledBy,
  describedBy,
  busy = false,
  onClose,
  children,
}) => {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, []);

  // Escape dispatches the native 'cancel' event. Route it through onClose so the
  // parent's state stays in sync, and swallow it entirely while work is in flight.
  const onCancel = (event) => {
    event.preventDefault();
    if (!busy) onClose();
  };

  // A click that lands on the <dialog> itself but outside its content box is a
  // backdrop click. Checking target === dialog alone would also fire on the
  // panel's own padding; the rectangle test excludes that.
  const onClick = (event) => {
    if (busy || event.target !== ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (outside) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`.trim()}
      role={role}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={onCancel}
      onClick={onClick}
    >
      {children}
    </dialog>
  );
};
