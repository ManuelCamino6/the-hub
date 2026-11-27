import Link from "next/link";

import {
    Check,
    type LucideIcon,
} from "lucide-react";

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type PricingCardProps = {
    title: string;
    description: string;
    price: string;
    period: string;
    features: string[];
    icon: LucideIcon;
    action: string;
    primary?: boolean;
};

export function PricingCard({
    title,
    description,
    price,
    period,
    features,
    icon: Icon,
    action,
    primary = false,
}: PricingCardProps) {
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <Icon className="size-6" />

                <CardTitle>{title}</CardTitle>

                <CardDescription>
                    {description}
                </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <p className="text-2xl font-semibold">
                        {price}
                    </p>

                    <p className="text-sm text-muted-foreground">
                        {period}
                    </p>
                </div>

                <Separator />

                <ul className="flex flex-col gap-3">
                    {features.map((feature) => (
                        <li
                            key={feature}
                            className="flex items-start gap-2 text-sm"
                        >
                            <Check
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            />

                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>

            <CardFooter>
                <Button
                    asChild
                    className="w-full"
                    variant={primary ? "default" : "outline"}
                >
                    <Link href="/signup">
                        {action}
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}