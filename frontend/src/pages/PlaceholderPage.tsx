
interface PlaceholderPageProps {
  title: string;
  description: string;
}

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="rounded-2xl bg-blue-50 p-5 text-blue-600">
        <span className="text-3xl font-bold">K</span>
      </div>

      <h1 className="mt-6 text-2xl font-bold text-slate-900">
        {title}
      </h1>

      <p className="mt-2 max-w-md text-sm text-slate-500">
        {description}
      </p>

      <span className="mt-5 rounded-full bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
        Coming soon
      </span>
    </div>
  );
}

export default PlaceholderPage;
