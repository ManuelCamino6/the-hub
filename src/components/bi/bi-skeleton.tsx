import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import {
  Skeleton,
} from "@/components/ui/skeleton";

export function BiSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>

      <CardContent className="grid gap-4">
        {Array.from(
          { length: 6 },
          (_, index) => (
            <div
              key={index}
              className="grid gap-2"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}