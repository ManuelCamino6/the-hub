import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";

import {
  Skeleton,
} from "@/components/ui/skeleton";

export function NewsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />

      <Skeleton className="h-4 w-full max-w-md" />

      {Array.from(
        { length: 3 },
        (_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />

              <Skeleton className="h-6 w-48" />
            </CardHeader>

            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />

              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}