import useToastStore from "../../stores/toastStore";

export default function Toast() {
  const items = useToastStore((state) => state.items);
  const remove = useToastStore((state) => state.remove);

  if (!items.length) return null;

  return (
    <div className="tw-toast-wrap" aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div key={item.id} className={`tw-toast tw-toast-${item.type}`}>
          <div>{item.message}</div>
          <button type="button" onClick={() => remove(item.id)} aria-label="Dismiss notification">
            x
          </button>
        </div>
      ))}
    </div>
  );
}
