import { KalaricaLoader } from "@/components/loading/kalarica-loader";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <KalaricaLoader size="lg" />
    </div>
  );
}
