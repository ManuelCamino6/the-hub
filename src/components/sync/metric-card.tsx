import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

type Props = {
    label: string;
    value: number | string;
    description?: string;
};

export function MetricCard({
    label,
    value,
    description,
}: Props) {
    return (
        <Card>
            <CardHeader>
                <CardDescription>
                    {label}
                </CardDescription>

                <CardTitle className="text-2xl tabular-nums">
                    {value}
                </CardTitle>
            </CardHeader>

            {description && (
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                </CardContent>
            )}
        </Card>
    );
}