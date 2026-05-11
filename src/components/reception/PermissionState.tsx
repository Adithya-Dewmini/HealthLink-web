type PermissionStateProps = {
  title: string;
  message: string;
};

export default function PermissionState({ title, message }: PermissionStateProps) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Permission required</p>
      <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-800">{message}</p>
    </div>
  );
}
