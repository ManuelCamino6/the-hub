import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import {
  Skeleton,
} from "@/components/ui/skeleton";

export function BillingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}